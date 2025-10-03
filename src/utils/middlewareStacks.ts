// src/utils/middlewareStacks.ts (FINALIZED, COMPLETE)

// NOTE: Assume all required functions (isAuthenticated, rbac, validate, cacheMiddleware) 
// are correctly imported into this file via their respective paths.

import { isAuthenticated } from "../middlewares/auth";
import { cacheMiddleware, CacheMiddlewareOptions } from "../middlewares/cacheMiddleware";
import { rbac } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";

// Type definition for a reusable Express Middleware stack
type MiddlewareStack = (permission: string, bodySchema?: any, paramSchema?: any) => any[];

// --------------------------------------------------------------------------
// --- CORE REUSABLE STACKS ---
// --------------------------------------------------------------------------

/**
 * Stack for Public (Unauthenticated) Routes that only require Zod validation.
 * Used for /register, /login, /forgot-password.
 * @param schema The Zod schema for validation (can contain body, params, or query).
 */
export const getPublicValidationStack = (schema: any): any[] => [
    validate(schema),
];


/**
 * Stack for POST/PUT/PATCH requests requiring AUTH, RBAC, and Body Validation.
 * @param permission The required RBAC permission string.
 * @param bodySchema The Zod schema for req.body validation.
 * @param paramSchema The Zod schema for req.params validation (optional).
 */
export const getMutationStack = (permission: string, bodySchema: any, paramSchema?: any): any[] => {
    const stack = [
        isAuthenticated,
        rbac(permission),
    ];
    
    // 1. If a parameter schema is provided (for /:id routes), validate the parameters first.
    if (paramSchema) {
        stack.push(validate(paramSchema));
    }
    
    // 2. Validate the request body.
    stack.push(validate(bodySchema));
    
    return stack;
};

/**
 * Stack for DELETE requests requiring AUTH, RBAC, and Parameter Validation.
 * @param permission The required RBAC permission string.
 * @param paramSchema The Zod schema for req.params validation.
 */
export const getDeleteStack = (permission: string, paramSchema: any): any[] => [
    isAuthenticated,
    rbac(permission),
    validate(paramSchema),
];

/**
 * Stack for GET requests requiring Authentication, Caching and Parameter Validation.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
export const getCacheStack = (baseKey: string, options: CacheMiddlewareOptions, paramSchema: any): any[] => [
    isAuthenticated,
    cacheMiddleware(baseKey, options),
    validate(paramSchema)
];

/**
 * Stack for PUBLIC GET requests requiring only Caching and Parameter Validation (NO AUTH).
 * Use this only for truly public endpoints like course listings.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
export const getPublicCacheStack = (baseKey: string, options: CacheMiddlewareOptions, paramSchema: any): any[] => [
    cacheMiddleware(baseKey, options),
    validate(paramSchema)
];