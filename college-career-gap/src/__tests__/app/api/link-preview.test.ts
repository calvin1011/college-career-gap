/**
 * @jest-environment node
 */

// Mock undici Agent so no real DNS / TCP happens
jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
}));

// Mock Node's dns module (used inside makeSafeAgent's lookup hook)
jest.mock('dns', () => ({
  lookup: jest.fn(),
}));

// Mock ipaddr.js parse/isValid so we can control IP range checks
jest.mock('ipaddr.js', () => {
  const real = jest.requireActual('ipaddr.js');
  return real; // use real implementation — it has no side-effects
});

import { GET } from '@/app/api/link-preview/route';
import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfterMs: 0 }),
}));

const mockCheckRateLimit = checkRateLimit as jest.Mock;

// Helper: build a GET request for the link-preview endpoint
function makeReq(url?: string, ip?: string): NextRequest {
  const reqUrl = url
    ? `http://localhost/api/link-preview?url=${encodeURIComponent(url)}`
    : 'http://localhost/api/link-preview';
  return new NextRequest(reqUrl, {
    headers: ip ? { 'x-forwarded-for': ip } : {},
  });
}

// Restore global.fetch after each test
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
});

// ── rate limiting ────────────────────────────────────────────────────────────
describe('GET /api/link-preview — rate limiting', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterMs: 30_000 });
    const res = await GET(makeReq('https://example.com'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it('includes Retry-After header when rate limited', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterMs: 30_000 });
    const res = await GET(makeReq('https://example.com'));
    expect(res.headers.get('Retry-After')).toBe('30');
  });
});

// ── missing / invalid URL parameter ─────────────────────────────────────────
describe('GET /api/link-preview — URL validation', () => {
  it('returns 400 when the url query param is absent', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url is required/i);
  });

  it('returns 400 for a non-HTTPS URL (http://)', async () => {
    const res = await GET(makeReq('http://example.com/page'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not allowed/i);
  });

  it('returns 400 for an ftp:// URL', async () => {
    const res = await GET(makeReq('ftp://example.com'));
    expect(res.status).toBe(400);
  });

  // ── SSRF – by hostname ─────────────────────────────────────────────────
  it('blocks "localhost" by name', async () => {
    const res = await GET(makeReq('https://localhost/admin'));
    expect(res.status).toBe(400);
  });

  // ── SSRF – IPv4 literals ───────────────────────────────────────────────
  it('blocks loopback address 127.0.0.1', async () => {
    const res = await GET(makeReq('https://127.0.0.1/'));
    expect(res.status).toBe(400);
  });

  it('blocks private range 10.x.x.x', async () => {
    const res = await GET(makeReq('https://10.0.0.1/'));
    expect(res.status).toBe(400);
  });

  it('blocks private range 192.168.x.x', async () => {
    const res = await GET(makeReq('https://192.168.1.1/'));
    expect(res.status).toBe(400);
  });

  it('blocks private range 172.16.x.x', async () => {
    const res = await GET(makeReq('https://172.16.0.1/'));
    expect(res.status).toBe(400);
  });

  it('blocks link-local (cloud metadata) 169.254.169.254', async () => {
    const res = await GET(makeReq('https://169.254.169.254/latest/meta-data/'));
    expect(res.status).toBe(400);
  });

  it('blocks CGNAT range 100.64.0.1', async () => {
    const res = await GET(makeReq('https://100.64.0.1/'));
    expect(res.status).toBe(400);
  });

  // ── SSRF – IPv6 literals ───────────────────────────────────────────────
  it('blocks IPv6 loopback [::1]', async () => {
    const res = await GET(makeReq('https://[::1]/'));
    expect(res.status).toBe(400);
  });

  // ── valid public URL ───────────────────────────────────────────────────
  it('passes a legitimate public URL through to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head>' +
        '<meta property="og:title" content="OG Title" />' +
        '<meta property="og:description" content="OG Desc" />' +
        '</head></html>',
    }) as unknown as typeof fetch;

    const res = await GET(makeReq('https://example.com/article'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('OG Title');
    expect(body.description).toBe('OG Desc');
    expect(body.domain).toBe('example.com');
  });

  it('returns title from <title> tag when og:title is absent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head><title>Page Title</title></head></html>',
    }) as unknown as typeof fetch;

    const res = await GET(makeReq('https://example.com/page'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Page Title');
  });

  it('returns 500 when the upstream fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    }) as unknown as typeof fetch;

    const res = await GET(makeReq('https://example.com/missing'));
    expect(res.status).toBe(500);
  });
});
