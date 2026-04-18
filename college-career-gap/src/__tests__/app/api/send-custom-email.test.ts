/**
 * @jest-environment node
 *
 * Tests for POST /api/send-custom-email
 *
 * next/jest uses SWC which does NOT auto-hoist `mock*` const variables alongside
 * jest.mock() factories the way babel-jest does.  All mock functions are therefore
 * created *inside* the factory; the email-send mock is stashed on the constructor
 * via Object.assign so tests can reference it without relying on `instances[]`.
 */

jest.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminDb: { collection: jest.fn() },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
}));

// Stash the send fn on the constructor so it survives jest.clearAllMocks()
jest.mock('resend', () => {
  const __sendFn = jest.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null });
  const MockResend = jest.fn().mockImplementation(() => ({ emails: { send: __sendFn } }));
  Object.assign(MockResend, { __sendFn });
  return { Resend: MockResend };
});

import { POST } from '@/app/api/send-custom-email/route';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';
import { Resend } from 'resend';

// Typed references to the mock functions
const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;
const mockCollection = adminDb.collection as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
// Access the persistent send mock directly from the constructor stash
const emailSendMock = (Resend as unknown as { __sendFn: jest.Mock }).__sendFn;

// ── helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  body: Record<string, unknown>,
  authToken?: string,
  ip = '1.2.3.4',
): NextRequest {
  return new NextRequest('http://localhost/api/send-custom-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Wire the Firebase mocks for a successfully authenticated admin user. */
function setupAdminAuth(uid = 'admin-uid') {
  mockVerifyIdToken.mockResolvedValueOnce({ uid });
  mockCollection.mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' }),
      }),
    }),
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({ empty: false }),
      }),
    }),
  });
}

// ── test suite ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  emailSendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });
});

describe('POST /api/send-custom-email', () => {
  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeReq({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/unauthorized/i);
  });

  it('returns 401 when the Bearer token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase: invalid token'));
    const res = await POST(
      makeReq({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }, 'bad-token'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const req = new NextRequest('http://localhost/api/send-custom-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'justtoken' },
      body: JSON.stringify({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ── authorisation ────────────────────────────────────────────────────────
  it('returns 403 when user role is not admin', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'student-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: 'student' }),
        }),
      }),
    });
    const res = await POST(
      makeReq({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }, 'valid-token'),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/forbidden/i);
  });

  it('returns 403 when the user document does not exist', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'ghost-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({ exists: false, data: () => null }),
      }),
    });
    const res = await POST(
      makeReq({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }, 'valid-token'),
    );
    expect(res.status).toBe(403);
  });

  // ── rate limiting ────────────────────────────────────────────────────────
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterMs: 60_000 });
    const res = await POST(
      makeReq({ to: 'a@b.com', subject: 'Hi', message: 'Hello' }, 'token'),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  // ── request body validation ──────────────────────────────────────────────
  it('returns 400 when required fields are missing', async () => {
    setupAdminAuth();
    const res = await POST(makeReq({ to: 'a@b.com' }, 'valid-token'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it('returns 400 for an invalid email format', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'admin-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: 'admin' }),
        }),
      }),
    });
    const res = await POST(
      makeReq({ to: 'not-an-email', subject: 'Hi', message: 'Hello' }, 'valid-token'),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it('returns 400 when the recipient is not found in the system', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'admin-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: 'admin' }),
        }),
      }),
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValueOnce({ empty: true }),
        }),
      }),
    });
    const res = await POST(
      makeReq(
        { to: 'unknown@example.com', subject: 'Hi', message: 'Hello' },
        'valid-token',
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  // ── success ──────────────────────────────────────────────────────────────
  it('returns 200 and calls Resend on a valid request', async () => {
    setupAdminAuth();
    const res = await POST(
      makeReq(
        { to: 'student@adams.edu', subject: 'Opportunity', message: 'Check this out' },
        'valid-token',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(emailSendMock).toHaveBeenCalledTimes(1);
  });

  it('sends the correct to/subject to Resend', async () => {
    setupAdminAuth();
    await POST(
      makeReq(
        { to: 'student@adams.edu', subject: 'Career Fair', message: 'Join us' },
        'valid-token',
      ),
    );
    const args = emailSendMock.mock.calls[0][0] as { to: string; subject: string };
    expect(args.to).toBe('student@adams.edu');
    expect(args.subject).toBe('Career Fair');
  });

  it('returns 500 when Resend returns an error object', async () => {
    setupAdminAuth();
    emailSendMock.mockResolvedValueOnce({ data: null, error: { message: 'API error' } });
    const res = await POST(
      makeReq(
        { to: 'student@adams.edu', subject: 'Hi', message: 'Hello' },
        'valid-token',
      ),
    );
    expect(res.status).toBe(500);
  });
});
