import { CacheMiddlewareOptions } from "../middlewares/cacheMiddleware";
/**
 * Stack for Public (Unauthenticated) Routes that only require Zod validation.
 * Used for /register, /login, /forgot-password.
 * @param schema The Zod schema for validation (can contain body, params, or query).
 */
export declare const getPublicValidationStack: (schema: any) => any[];
/**
 * Stack for POST/PUT/PATCH requests requiring AUTH, RBAC, and Body Validation.
 * @param permission The required RBAC permission string.
 * @param bodySchema The Zod schema for req.body validation.
 * @param paramSchema The Zod schema for req.params validation (optional).
 */
export declare const getMutationStack: (permission: string, bodySchema: any, paramSchema?: any) => any[];
/**
 * Stack for DELETE requests requiring AUTH, RBAC, and Parameter Validation.
 * @param permission The required RBAC permission string.
 * @param paramSchema The Zod schema for req.params validation.
 */
export declare const getDeleteStack: (permission: string, paramSchema: any) => any[];
/**
 * Stack for GET requests requiring Authentication, Caching and Parameter Validation.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
export declare const getCacheStack: (baseKey: string, options: CacheMiddlewareOptions, paramSchema: any) => any[];
/**
 * Stack for PUBLIC GET requests requiring only Caching and Parameter Validation (NO AUTH).
 * Use this only for truly public endpoints like course listings.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
export declare const getPublicCacheStack: (baseKey: string, options: CacheMiddlewareOptions, paramSchema: any) => any[];
//# sourceMappingURL=middlewareStacks.d.ts.map