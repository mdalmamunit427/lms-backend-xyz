"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = void 0;
const cacheKey_1 = require("../utils/cacheKey");
const course_service_1 = require("../modules/courses/course.service");
const cache_1 = require("../utils/cache");
const errorHandler_1 = require("../utils/errorHandler");
// A dedicated function to handle the cache refresh
const refreshCache = async (queryOptions, cacheKey) => {
    try {
        const freshData = await (0, course_service_1.getAllCoursesService)({ ...queryOptions });
        await (0, cache_1.setCache)(cacheKey, { ...freshData, cached: false });
    }
    catch (error) {
        console.error("Failed to refresh cache:", error);
    }
};
const cacheMiddleware = (baseKey, options = {}) => {
    return async (req, res, next) => {
        try {
            const params = {};
            if (options.param) {
                const value = req.params[options.param];
                if (value !== undefined && value !== null && value !== "") {
                    params[options.param] = value;
                }
            }
            if (options.isList) {
                for (const [key, value] of Object.entries(req.query)) {
                    if (value !== undefined && value !== null && value !== "") {
                        params[key] = Array.isArray(value) ? value.join(",") : String(value);
                    }
                }
            }
            const cacheKey = (0, cacheKey_1.generateCacheKey)(baseKey, params);
            const cached = await (0, cache_1.getCacheWithTTL)(cacheKey);
            if (cached && cached.data) {
                if (cached.ttl > 0) {
                    return res.json({ ...cached.data, cached: true });
                }
                else {
                    // Send stale data immediately
                    res.json({ ...cached.data, cached: 'stale' });
                    // Asynchronously trigger a cache refresh without blocking the response
                    const queryOptions = {
                        page: parseInt(req.query.page || '1', 10),
                        limit: parseInt(req.query.limit || '9', 10),
                        search: req.query.search,
                        category: req.query.category,
                    };
                    refreshCache(queryOptions, cacheKey);
                    return;
                }
            }
            // Cache miss: Pass cache key to controller for setting
            req.cacheKey = cacheKey;
            next();
        }
        catch (error) {
            console.error("Cache middleware error:", error);
            next((0, errorHandler_1.createError)('Cache middleware failed', 500));
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
//# sourceMappingURL=cacheMiddleware.js.map