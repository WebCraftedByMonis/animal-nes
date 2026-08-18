import { getConnectedRedisClient } from './redisClient'

// Read-through cache built on the same Redis instance the rate limiter
// uses. Fails OPEN like the rate limiter does — if Redis is unreachable,
// `cached()` just calls `compute` directly, so a cache outage makes a page
// as slow as it was before caching existed, never broken.
//
// Deliberately TTL-only, no active invalidation: the things this is used
// for (category/brand nav lists, price range bounds, the SEO product
// index) don't need to reflect an edit within seconds, and wiring
// invalidation into every product/price mutation across the app would be
// a much larger, riskier change for very little real benefit here.

export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const client = await getConnectedRedisClient()
  const redisKey = `cache:${key}`

  if (client) {
    try {
      const hit = await client.get(redisKey)
      if (hit !== null) return JSON.parse(hit) as T
    } catch (error) {
      console.error('[cache] read failed, falling back to source:', key, error)
    }
  }

  const value = await compute()

  if (client) {
    try {
      await client.set(redisKey, JSON.stringify(value), { EX: ttlSeconds })
    } catch (error) {
      console.error('[cache] write failed:', key, error)
    }
  }

  return value
}

export async function invalidateCache(key: string) {
  const client = await getConnectedRedisClient()
  if (!client) return
  try {
    await client.del(`cache:${key}`)
  } catch (error) {
    console.error('[cache] invalidate failed:', key, error)
  }
}
