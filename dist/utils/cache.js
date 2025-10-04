"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.namespacedKey = void 0;
exports.setCache = setCache;
exports.getCacheWithTTL = getCacheWithTTL;
exports.getCache = getCache;
exports.invalidateCache = invalidateCache;
exports.invalidateCacheAsync = invalidateCacheAsync;
exports.invalidateCacheBatch = invalidateCacheBatch;
// Refactored to support Stale-While-Revalidate
const cacheConfig_1 = require("../config/cacheConfig");
const redis_1 = require("../config/redis");
const namespacedKey = (key) => `${cacheConfig_1.CACHE_PREFIX}${key}`;
exports.namespacedKey = namespacedKey;
async function setCache(key, value, ttlSeconds = cacheConfig_1.DEFAULT_TTL) {
    // Store the data with its expiration time
    await redis_1.redis.set((0, exports.namespacedKey)(key), JSON.stringify(value), "EX", ttlSeconds);
}
// Get both the data and the remaining TTL
async function getCacheWithTTL(key) {
    const namespaced = (0, exports.namespacedKey)(key);
    // Safely cast the result to an array of [error, result] tuples
    const result = await redis_1.redis.multi().get(namespaced).ttl(namespaced).exec();
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
async function getCache(key) {
    const namespaced = (0, exports.namespacedKey)(key);
    const data = await redis_1.redis.get(namespaced);
    return data ? JSON.parse(data) : null;
}
// Invalidate cache with timeout and error handling
async function invalidateCache(pattern) {
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
                redis_1.redis.scan(cursor, "MATCH", (0, exports.namespacedKey)(`${pattern}*`), "COUNT", 100),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cache scan timeout')), 2000))
            ]);
            if (keys.length > 0) {
                const result = await Promise.race([
                    redis_1.redis.del(...keys),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Cache delete timeout')), 2000))
                ]);
                deletedCount += result;
            }
            cursor = nextCursor;
        } while (cursor !== "0");
        return deletedCount;
    }
    catch (error) {
        console.error(`Cache invalidation failed for pattern ${pattern}:`, error);
        return 0; // Return 0 instead of throwing to prevent blocking main operations
    }
}
// Non-blocking cache invalidation for background operations
function invalidateCacheAsync(pattern) {
    // Fire and forget - don't await this
    invalidateCache(pattern).catch(error => {
        console.error(`Async cache invalidation failed for pattern ${pattern}:`, error);
    });
}
// Batch cache invalidation for multiple patterns
async function invalidateCacheBatch(patterns) {
    const promises = patterns.map(pattern => invalidateCache(pattern));
    const results = await Promise.allSettled(promises);
    return results.reduce((total, result) => {
        if (result.status === 'fulfilled') {
            return total + result.value;
        }
        return total;
    }, 0);
}
//# sourceMappingURL=cache.js.map