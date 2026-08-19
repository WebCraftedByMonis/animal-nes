import { getConnectedRedisClient, withTimeout } from './redisClient'

// Rate limiting for public, unauthenticated-or-lightly-authenticated forms
// (vendor sign-up, product submissions, affiliate sign-up). Uses the Redis
// instance already provisioned in .env (REDIS_URL/REDIS_TOKEN) — previously
// installed but never wired up anywhere in the app.
//
// Fails OPEN: if Redis is unreachable, requests are allowed through. A rate
// limiter being temporarily down should never stop a real person from
// signing up — it only exists to slow down floods, not to gate the feature.

/**
 * Fixed-window rate limit. `key` should already be unique to the action +
 * identity being limited (e.g. "vendor-register:203.0.113.4").
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const c = await getConnectedRedisClient()
    if (!c) return { allowed: true, remaining: limit }

    const redisKey = `ratelimit:${key}`
    const count = await withTimeout(c.incr(redisKey))
    if (count === 1) {
      await withTimeout(c.expire(redisKey, windowSeconds))
    }

    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch (error) {
    console.error('[RateLimit] Check failed, allowing request through:', error)
    return { allowed: true, remaining: limit }
  }
}

// Best-effort client IP extraction. The app sits behind nginx, which sets
// X-Forwarded-For; falls back to X-Real-IP, then a constant so unrelated
// requests still share (and thus rate-limit) sensibly if neither is set.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
