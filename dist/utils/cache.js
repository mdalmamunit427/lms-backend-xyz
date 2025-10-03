"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.namespacedKey = void 0;
exports.setCache = setCache;
exports.getCacheWithTTL = getCacheWithTTL;
exports.getCache = getCache;
exports.invalidateCache = invalidateCache;
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
// Invalidate cache (no change)
async function invalidateCache(pattern) {
    let cursor = "0";
    let deletedCount = 0;
    do {
        const [nextCursor, keys] = await redis_1.redis.scan(cursor, "MATCH", (0, exports.namespacedKey)(`${pattern}*`), "COUNT", 100);
        if (keys.length > 0) {
            const result = await redis_1.redis.del(...keys);
            deletedCount += result;
        }
        cursor = nextCursor;
    } while (cursor !== "0");
    return deletedCount;
}
//# sourceMappingURL=cache.js.map