/**
 * Sliding-window in-memory rate limiter.
 *
 * Each (key, endpoint) pair maintains a sorted list of timestamps within the
 * current window. Once the count exceeds the limit the call is rejected.
 *
 * ⚠  Serverless caveat: on Vercel each cold-started instance has its own
 *    memory, so this limiter operates per-instance rather than globally.
 *    It still meaningfully protects against burst abuse on a single instance
 *    and is dependency-free. For a distributed global limit, replace with
 *    Upstash Redis + @upstash/ratelimit.
 */

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit:     number
  /** Window duration in milliseconds. */
  windowMs:  number
}

interface RateLimitResult {
  success:    boolean
  /** Remaining requests in the current window. */
  remaining:  number
  /** Unix ms timestamp when the window resets. */
  resetAt:    number
}

// Module-level store — persists across requests within the same instance.
const store = new Map<string, number[]>()

// Prune the store every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, timestamps] of store.entries()) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 60 * 60_000) {
        store.delete(key)
      }
    }
  }, 5 * 60_000)
}

/**
 * Check whether the given key has exceeded its rate limit.
 *
 * @param key       A unique string identifying the caller (e.g. IP + endpoint).
 * @param options   Limit and window configuration.
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = options
  const now    = Date.now()
  const cutoff = now - windowMs

  const timestamps = (store.get(key) ?? []).filter(t => t > cutoff)
  timestamps.push(now)
  store.set(key, timestamps)

  const count     = timestamps.length
  const success   = count <= limit
  const remaining = Math.max(0, limit - count)
  const resetAt   = timestamps[0] + windowMs   // when the oldest request expires

  return { success, remaining, resetAt }
}

/**
 * Extract the best available IP address from an incoming request.
 * Respects the Vercel/Cloudflare forwarding headers.
 */
export function getClientIp(request: Request): string {
  const headers = (request as { headers: Headers }).headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}

// ─── Pre-configured limits ────────────────────────────────────────────────────

/**
 * Payment initiation: max 5 attempts per IP per 15 minutes.
 * Prevents brute-force payment spam.
 */
export const PAYMENT_RATE_LIMIT: RateLimitOptions = {
  limit:    5,
  windowMs: 15 * 60_000,
}

/**
 * Document upload: max 30 uploads per IP per 10 minutes.
 * Prevents storage abuse while allowing legitimate bulk uploads.
 */
export const UPLOAD_RATE_LIMIT: RateLimitOptions = {
  limit:    30,
  windowMs: 10 * 60_000,
}

/**
 * General API: max 60 requests per IP per minute.
 * Broad protection for other sensitive endpoints.
 */
export const API_RATE_LIMIT: RateLimitOptions = {
  limit:    60,
  windowMs: 60_000,
}
