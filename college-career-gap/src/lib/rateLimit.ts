/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for single-process deployments (Next.js dev server, single Vercel
 * instance). For multi-instance deployments, replace the Map with a shared
 * store (Redis / Upstash).
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Prune entries older than 2× the longest expected window every 5 minutes
// to prevent unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param key        Unique identifier for this bucket (IP, UID, etc.)
 * @param maxRequests  Max allowed requests within the window
 * @param windowMs   Window duration in milliseconds
 * @returns `{ allowed: boolean; retryAfterMs: number }`
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Slide the window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}
