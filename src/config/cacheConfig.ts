export const CACHE_PREFIX = process.env.NODE_ENV === "production" ? "lms:prod:" : "lms:dev:";
export const DEFAULT_TTL = 20 * 60; // 15 minutes
export const USER_CACHE_TTL = 15 * 24 * 60 * 60; //15 days