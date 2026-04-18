/**
 * @jest-environment node
 *
 * Tests for POST /api/send-admin-notification
 */

jest.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminDb: { collection: jest.fn() },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
}));

jest.mock('resend', () => {
  const __sendFn = jest.fn().mockResolvedValue({ data: { id: 'notif-id' }, error: null });
  const MockResend = jest.fn().mockImplementation(() => ({ emails: { send: __sendFn } }));
  Object.assign(MockResend, { __sendFn });
  return { Resend: MockResend };
});

import { POST } from '@/app/api/send-admin-notification/route';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';
import { Resend } from 'resend';

const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;
const mockCollection = adminDb.collection as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const emailSendMock = (Resend as unknown as { __sendFn: jest.Mock }).__sendFn;

// ── helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  body: Record<string, unknown>,
  authToken?: string,
  ip = '1.2.3.4',
): NextRequest {
  return new NextRequest('http://localhost/api/send-admin-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  professorEmail: 'prof@adams.edu',
  professorName: 'Dr. Smith',
  channelName: 'Computer Science',
  superAdminUid: 'super-uid-123',
};

function setupAdminAuth(uid = 'admin-uid') {
  mockVerifyIdToken.mockResolvedValueOnce({ uid });
  mockCollection.mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ role: 'admin' }),
      }),
    }),
  });
}

// ── test suite ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  emailSendMock.mockResolvedValue({ data: { id: 'notif-id' }, error: null });
});

describe('POST /api/send-admin-notification', () => {
  // ── authentication ───────────────────────────────────────────────────────
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it('returns 401 when the Bearer token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid token'));
    const res = await POST(makeReq(VALID_BODY, 'bad-token'));
    expect(res.status).toBe(401);
  });

  // ── authorisation ────────────────────────────────────────────────────────
  it('returns 403 when the user role is not admin', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'prof-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ role: 'professor' }),
        }),
      }),
    });
    const res = await POST(makeReq(VALID_BODY, 'valid-token'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when the user document does not exist', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'ghost-uid' });
    mockCollection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({ exists: false, data: () => null }),
      }),
    });
    const res = await POST(makeReq(VALID_BODY, 'valid-token'));
    expect(res.status).toBe(403);
  });

  // ── rate limiting ────────────────────────────────────────────────────────
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterMs: 45_000 });
    const res = await POST(makeReq(VALID_BODY, 'token'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
  });

  // ── body validation ──────────────────────────────────────────────────────
  it('returns 400 when professorEmail is missing', async () => {
    setupAdminAuth();
    const { professorEmail: _, ...body } = VALID_BODY;
    const res = await POST(makeReq(body, 'valid-token'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it('returns 400 when professorName is missing', async () => {
    setupAdminAuth();
    const { professorName: _, ...body } = VALID_BODY;
    const res = await POST(makeReq(body, 'valid-token'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when channelName is missing', async () => {
    setupAdminAuth();
    const { channelName: _, ...body } = VALID_BODY;
    const res = await POST(makeReq(body, 'valid-token'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when superAdminUid is missing', async () => {
    setupAdminAuth();
    const { superAdminUid: _, ...body } = VALID_BODY;
    const res = await POST(makeReq(body, 'valid-token'));
    expect(res.status).toBe(400);
  });

  // ── success ──────────────────────────────────────────────────────────────
  it('returns 200 and calls Resend for a valid admin request', async () => {
    setupAdminAuth();
    const res = await POST(makeReq(VALID_BODY, 'valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(emailSendMock).toHaveBeenCalledTimes(1);
  });

  it('sends to the correct professorEmail with channel in subject', async () => {
    setupAdminAuth();
    await POST(makeReq(VALID_BODY, 'valid-token'));
    const args = emailSendMock.mock.calls[0][0] as { to: string; subject: string };
    expect(args.to).toBe('prof@adams.edu');
    expect(args.subject).toContain('Computer Science');
  });

  it('returns 500 when Resend returns an error object', async () => {
    setupAdminAuth();
    emailSendMock.mockResolvedValueOnce({ data: null, error: { message: 'API error' } });
    const res = await POST(makeReq(VALID_BODY, 'valid-token'));
    expect(res.status).toBe(500);
  });
});
