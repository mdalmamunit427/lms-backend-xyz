// Refactored to support Stale-While-Revalidate
import { CACHE_PREFIX, DEFAULT_TTL } from "../config/cacheConfig";
import { redis } from "../config/redis";

export const namespacedKey = (key: string) => `${CACHE_PREFIX}${key}`;

export async function setCache(key: string, value: any, ttlSeconds = DEFAULT_TTL) {
  // Store the data with its expiration time
  await redis.set(namespacedKey(key), JSON.stringify(value), "EX", ttlSeconds);
}

// Get both the data and the remaining TTL
export async function getCacheWithTTL<T = any>(key: string): Promise<{ data: T | null; ttl: number } | null> {
  const namespaced = namespacedKey(key);
  
  // Safely cast the result to an array of [error, result] tuples
  const result = await redis.multi().get(namespaced).ttl(namespaced).exec() as [string | null, string | null][];

  if (!result || !result[0] || !result[1]) {
    return null;
  }
  
  const [data, ttl] = [result[0][1], result[1][1]];
  
  if (!data) {
    return null;
  }
  
  // Return the data and TTL, correctly typed
  return { data: JSON.parse(data), ttl: Number(ttl) };
}

// Corrected: A new function to get just the cache data
export async function getCache<T = any>(key: string): Promise<T | null> {
    const namespaced = namespacedKey(key);
    const data = await redis.get(namespaced);
    return data ? JSON.parse(data) : null;
}

// Invalidate cache (no change)
export async function invalidateCache(pattern: string): Promise<number> {
  let cursor = "0";
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", namespacedKey(`${pattern}*`), "COUNT", 100);
    if (keys.length > 0) {
      const result = await redis.del(...keys);
      deletedCount += result;
    }
    cursor = nextCursor;
  } while (cursor !== "0");

  return deletedCount;
}