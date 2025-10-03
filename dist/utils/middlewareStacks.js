"use strict";
// src/utils/middlewareStacks.ts (FINALIZED, COMPLETE)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicCacheStack = exports.getCacheStack = exports.getDeleteStack = exports.getMutationStack = exports.getPublicValidationStack = void 0;
// NOTE: Assume all required functions (isAuthenticated, rbac, validate, cacheMiddleware) 
// are correctly imported into this file via their respective paths.
const auth_1 = require("../middlewares/auth");
const cacheMiddleware_1 = require("../middlewares/cacheMiddleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
// --------------------------------------------------------------------------
// --- CORE REUSABLE STACKS ---
// --------------------------------------------------------------------------
/**
 * Stack for Public (Unauthenticated) Routes that only require Zod validation.
 * Used for /register, /login, /forgot-password.
 * @param schema The Zod schema for validation (can contain body, params, or query).
 */
const getPublicValidationStack = (schema) => [
    (0, validate_middleware_1.validate)(schema),
];
exports.getPublicValidationStack = getPublicValidationStack;
/**
 * Stack for POST/PUT/PATCH requests requiring AUTH, RBAC, and Body Validation.
 * @param permission The required RBAC permission string.
 * @param bodySchema The Zod schema for req.body validation.
 * @param paramSchema The Zod schema for req.params validation (optional).
 */
const getMutationStack = (permission, bodySchema, paramSchema) => {
    const stack = [
        auth_1.isAuthenticated,
        (0, rbac_middleware_1.rbac)(permission),
    ];
    // 1. If a parameter schema is provided (for /:id routes), validate the parameters first.
    if (paramSchema) {
        stack.push((0, validate_middleware_1.validate)(paramSchema));
    }
    // 2. Validate the request body.
    stack.push((0, validate_middleware_1.validate)(bodySchema));
    return stack;
};
exports.getMutationStack = getMutationStack;
/**
 * Stack for DELETE requests requiring AUTH, RBAC, and Parameter Validation.
 * @param permission The required RBAC permission string.
 * @param paramSchema The Zod schema for req.params validation.
 */
const getDeleteStack = (permission, paramSchema) => [
    auth_1.isAuthenticated,
    (0, rbac_middleware_1.rbac)(permission),
    (0, validate_middleware_1.validate)(paramSchema),
];
exports.getDeleteStack = getDeleteStack;
/**
 * Stack for GET requests requiring Authentication, Caching and Parameter Validation.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
const getCacheStack = (baseKey, options, paramSchema) => [
    auth_1.isAuthenticated,
    (0, cacheMiddleware_1.cacheMiddleware)(baseKey, options),
    (0, validate_middleware_1.validate)(paramSchema)
];
exports.getCacheStack = getCacheStack;
/**
 * Stack for PUBLIC GET requests requiring only Caching and Parameter Validation (NO AUTH).
 * Use this only for truly public endpoints like course listings.
 * @param baseKey Cache key prefix (e.g., 'chapters').
 * @param options Cache middleware options ({ param: 'id', isList: true }).
 * @param paramSchema The Zod schema for req.params validation.
 */
const getPublicCacheStack = (baseKey, options, paramSchema) => [
    (0, cacheMiddleware_1.cacheMiddleware)(baseKey, options),
    (0, validate_middleware_1.validate)(paramSchema)
];
exports.getPublicCacheStack = getPublicCacheStack;
//# sourceMappingURL=middlewareStacks.js.map