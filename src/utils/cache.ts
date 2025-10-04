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

// Invalidate cache with timeout and error handling
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    let cursor = "0";
    let deletedCount = 0;
    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout for cache operations

    do {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.warn(`Cache invalidation timeout for pattern: ${pattern}`);
        break;
      }

      const [nextCursor, keys] = await Promise.race([
        redis.scan(cursor, "MATCH", namespacedKey(`${pattern}*`), "COUNT", 100),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Cache scan timeout')), 2000)
        )
      ]);

      if (keys.length > 0) {
        const result = await Promise.race([
          redis.del(...keys),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Cache delete timeout')), 2000)
          )
        ]);
        deletedCount += result;
      }
      cursor = nextCursor;
    } while (cursor !== "0");

    return deletedCount;
  } catch (error) {
    console.error(`Cache invalidation failed for pattern ${pattern}:`, error);
    return 0; // Return 0 instead of throwing to prevent blocking main operations
  }
}

// Non-blocking cache invalidation for background operations
export function invalidateCacheAsync(pattern: string): void {
  // Fire and forget - don't await this
  invalidateCache(pattern).catch(error => {
    console.error(`Async cache invalidation failed for pattern ${pattern}:`, error);
  });
}

// Batch cache invalidation for multiple patterns
export async function invalidateCacheBatch(patterns: string[]): Promise<number> {
  const promises = patterns.map(pattern => invalidateCache(pattern));
  const results = await Promise.allSettled(promises);
  
  return results.reduce((total, result) => {
    if (result.status === 'fulfilled') {
      return total + result.value;
    }
    return total;
  }, 0);
}