import { createClient, type RedisClientType } from 'redis'

// Rate limiting for public, unauthenticated-or-lightly-authenticated forms
// (vendor sign-up, product submissions, affiliate sign-up). Uses the Redis
// instance already provisioned in .env (REDIS_URL/REDIS_TOKEN) — previously
// installed but never wired up anywhere in the app.
//
// Fails OPEN: if Redis is unreachable, requests are allowed through. A rate
// limiter being temporarily down should never stop a real person from
// signing up — it only exists to slow down floods, not to gate the feature.

let client: RedisClientType | null = null
let connectPromise: Promise<void> | null = null

function getClient(): RedisClientType | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  if (!client) {
    // .env stores REDIS_URL as "host:port" (no redis:// prefix) with the
    // password in a separate REDIS_TOKEN var, Redis Cloud style.
    const [host, portStr] = redisUrl.split(':')
    client = createClient({
      socket: { host, port: Number(portStr) },
      password: process.env.REDIS_TOKEN,
    })
    client.on('error', (err) => console.error('[RateLimit] Redis client error:', err.message))
  }
  return client
}

async function ensureConnected(): Promise<RedisClientType | null> {
  const c = getClient()
  if (!c) return null

  if (!c.isOpen) {
    if (!connectPromise) {
      connectPromise = c.connect().then(
        () => undefined,
        (err) => {
          console.error('[RateLimit] Redis connect failed:', err.message)
          connectPromise = null
        }
      )
    }
    await connectPromise
  }

  return c.isOpen ? c : null
}

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
    const c = await ensureConnected()
    if (!c) return { allowed: true, remaining: limit }

    const redisKey = `ratelimit:${key}`
    const count = await c.incr(redisKey)
    if (count === 1) {
      await c.expire(redisKey, windowSeconds)
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
