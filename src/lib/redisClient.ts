import { createClient, type RedisClientType } from 'redis'

// One shared, lazily-connected Redis client for the whole app — used by
// both the rate limiter (src/lib/rateLimit.ts) and the read-through cache
// (src/lib/cache.ts) so they don't each open their own connection.
//
// Bounded hard: if Redis is unreachable, callers must never hang waiting
// for it — both the rate limiter and the cache exist purely as
// optimizations/guards and are designed to fail open, but that only works
// if a stalled connection attempt can't block the request itself. A
// customer-facing page timing out because Redis was slow to answer would
// be strictly worse than not having caching/rate-limiting at all.

const CONNECT_TIMEOUT_MS = 2000

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
      socket: {
        host,
        port: Number(portStr),
        connectTimeout: CONNECT_TIMEOUT_MS,
        // We already re-attempt a connection per call (see below) — don't
        // let the client's own retry loop extend a single request's wait.
        reconnectStrategy: false,
      },
      password: process.env.REDIS_TOKEN,
    })
    client.on('error', (err) => console.error('[Redis] client error:', err.message))
  }
  return client
}

// Exported so callers (cache.ts, rateLimit.ts) can bound individual
// commands too, not just the initial connect — a connection that's
// technically open but stalled mid-command is the same risk either way.
export function withTimeout<T>(promise: Promise<T>, ms: number = CONNECT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis operation timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

export async function getConnectedRedisClient(): Promise<RedisClientType | null> {
  const c = getClient()
  if (!c) return null

  if (!c.isOpen) {
    if (!connectPromise) {
      connectPromise = withTimeout(c.connect(), CONNECT_TIMEOUT_MS).then(
        () => undefined,
        (err) => {
          console.error('[Redis] connect failed:', err.message)
          connectPromise = null
        }
      )
    }
    await connectPromise
  }

  return c.isOpen ? c : null
}
