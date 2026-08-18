import { createClient, type RedisClientType } from 'redis'

// One shared, lazily-connected Redis client for the whole app — used by
// both the rate limiter (src/lib/rateLimit.ts) and the read-through cache
// (src/lib/cache.ts) so they don't each open their own connection.

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
    client.on('error', (err) => console.error('[Redis] client error:', err.message))
  }
  return client
}

export async function getConnectedRedisClient(): Promise<RedisClientType | null> {
  const c = getClient()
  if (!c) return null

  if (!c.isOpen) {
    if (!connectPromise) {
      connectPromise = c.connect().then(
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
