/**
 * @jest-environment node
 */
import { checkRateLimit } from '@/lib/rateLimit';

// The rate limiter stores state on globalThis.__rateLimitStore.
// Clear it before every test so tests don't bleed into each other.
beforeEach(() => {
  globalThis.__rateLimitStore?.clear();
});

describe('checkRateLimit', () => {
  // ── basic allow / block ─────────────────────────────────────────────────
  it('allows the first request', () => {
    const { allowed, retryAfterMs } = checkRateLimit('k1', 5, 60_000);
    expect(allowed).toBe(true);
    expect(retryAfterMs).toBe(0);
  });

  it('allows requests right up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const { allowed } = checkRateLimit('k-burst', 5, 60_000);
      expect(allowed).toBe(true);
    }
  });

  it('blocks the request that is exactly one over the limit', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('k-over', 5, 60_000);
    const { allowed } = checkRateLimit('k-over', 5, 60_000);
    expect(allowed).toBe(false);
  });

  it('returns a positive retryAfterMs when blocked', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('k-retry', 3, 60_000);
    const { allowed, retryAfterMs } = checkRateLimit('k-retry', 3, 60_000);
    expect(allowed).toBe(false);
    expect(retryAfterMs).toBeGreaterThan(0);
    expect(retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('retryAfterMs is 0 when allowed', () => {
    const { retryAfterMs } = checkRateLimit('k-zero', 10, 60_000);
    expect(retryAfterMs).toBe(0);
  });

  // ── key isolation ───────────────────────────────────────────────────────
  it('isolates counters for different keys', () => {
    // Exhaust key-a
    for (let i = 0; i < 5; i++) checkRateLimit('isolated-a', 5, 60_000);
    expect(checkRateLimit('isolated-a', 5, 60_000).allowed).toBe(false);

    // key-b should still be fresh
    expect(checkRateLimit('isolated-b', 5, 60_000).allowed).toBe(true);
  });

  it('handles a maxRequests value of 1 correctly', () => {
    expect(checkRateLimit('k-one', 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit('k-one', 1, 60_000).allowed).toBe(false);
  });

  // ── sliding window ──────────────────────────────────────────────────────
  describe('sliding window (fake timers)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(0);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('allows new requests after the window has expired', () => {
      const key = 'win-slide';
      const windowMs = 1_000;
      for (let i = 0; i < 3; i++) checkRateLimit(key, 3, windowMs);
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(false);

      jest.advanceTimersByTime(windowMs + 1);
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(true);
    });

    it('counts only timestamps inside the window', () => {
      const key = 'win-count';
      const windowMs = 2_000;
      // Fire 2 at t=0
      checkRateLimit(key, 3, windowMs);
      checkRateLimit(key, 3, windowMs);

      // Advance so those two fall outside the window
      jest.advanceTimersByTime(windowMs + 1);

      // Fire 2 more at t=2001 — both should be allowed (counter reset)
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(true);
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(true);
    });

    it('computes retryAfterMs accurately', () => {
      const key = 'win-retry';
      const windowMs = 60_000;
      // Record 3 requests at t=0
      for (let i = 0; i < 3; i++) checkRateLimit(key, 3, windowMs);

      // Advance 10 s
      jest.advanceTimersByTime(10_000);
      const { allowed, retryAfterMs } = checkRateLimit(key, 3, windowMs);
      expect(allowed).toBe(false);
      // Oldest is at t=0; window ends at t=60000; now=10000 → ~50 000 ms left
      expect(retryAfterMs).toBeGreaterThan(49_000);
      expect(retryAfterMs).toBeLessThanOrEqual(60_000);
    });

    it('partial expiry: only expired timestamps are evicted', () => {
      const key = 'partial-evict';
      const windowMs = 4_000;

      // Two requests at t=0
      checkRateLimit(key, 3, windowMs);
      checkRateLimit(key, 3, windowMs);

      // Advance 3 s, add one more
      jest.advanceTimersByTime(3_000);
      checkRateLimit(key, 3, windowMs); // t=3000 → limit reached (3/3)

      // Advance 2 more s → t=5000. Timestamps at t=0 are outside the 4 s window,
      // but the one at t=3000 is still inside.
      jest.advanceTimersByTime(2_000);
      // 1 timestamp remains (t=3000 is within [1000..5000]). Should allow 2 more.
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(true);
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(true);
      expect(checkRateLimit(key, 3, windowMs).allowed).toBe(false); // 3rd would exceed
    });
  });
});
