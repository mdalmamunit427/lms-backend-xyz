"use strict";
// Functional service helper utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceFactory = exports.invalidateRelatedCache = exports.findPaginatedDocuments = exports.documentExists = exports.deleteDocumentById = exports.updateDocumentById = exports.countDocuments = exports.findDocuments = exports.findDocumentById = exports.createDocument = void 0;
const cache_1 = require("./cache");
const constants_1 = require("./constants");
const queryBuilder_1 = require("./queryBuilder");
/**
 * Create a new document
 */
const createDocument = async (model, data, options = {}) => {
    try {
        const document = new model(data);
        const savedDocument = await document.save();
        if (options.useCache && options.cacheKey) {
            await (0, exports.invalidateRelatedCache)(model.modelName.toLowerCase());
        }
        return {
            success: true,
            data: savedDocument,
            message: 'Resource created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to create resource',
            errors: [error.message]
        };
    }
};
exports.createDocument = createDocument;
/**
 * Find a document by ID
 */
const findDocumentById = async (model, id, options = {}) => {
    try {
        const cacheKey = options.cacheKey || `${model.modelName.toLowerCase()}:${id}`;
        // Try cache first
        if (options.useCache !== false) {
            const cached = await (0, cache_1.getCache)(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached,
                    message: 'Resource retrieved from cache'
                };
            }
        }
        // Build query
        const query = model.findById(id);
        if (options.populate) {
            query.populate(options.populate);
        }
        if (options.lean) {
            query.lean();
        }
        const document = await query.exec();
        // Cache the result
        if (options.useCache !== false && document) {
            await (0, cache_1.setCache)(cacheKey, document, options.cacheTTL || constants_1.CACHE_TTL.MEDIUM);
        }
        return {
            success: true,
            data: document,
            message: document ? 'Resource retrieved successfully' : 'Resource not found'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve resource',
            errors: [error.message]
        };
    }
};
exports.findDocumentById = findDocumentById;
/**
 * Find documents with query builder
 */
const findDocuments = async (model, queryBuilder, options = {}) => {
    try {
        const { query, options: queryOptions } = (0, queryBuilder_1.buildQuery)(queryBuilder);
        const cacheKey = options.cacheKey || `${model.modelName.toLowerCase()}:list:${JSON.stringify(query)}`;
        // Try cache first
        if (options.useCache !== false) {
            const cached = await (0, cache_1.getCache)(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached,
                    message: 'Resources retrieved from cache'
                };
            }
        }
        // Build mongoose query
        const mongooseQuery = model.find(query);
        if (queryOptions.populate) {
            mongooseQuery.populate(queryOptions.populate);
        }
        if (queryOptions.select) {
            mongooseQuery.select(queryOptions.select);
        }
        if (queryOptions.sort) {
            mongooseQuery.sort(queryOptions.sort);
        }
        if (queryOptions.skip) {
            mongooseQuery.skip(queryOptions.skip);
        }
        if (queryOptions.limit) {
            mongooseQuery.limit(queryOptions.limit);
        }
        if (options.lean || queryOptions.lean) {
            mongooseQuery.lean();
        }
        const documents = await mongooseQuery.exec();
        // Cache the result
        if (options.useCache !== false) {
            await (0, cache_1.setCache)(cacheKey, documents, options.cacheTTL || constants_1.CACHE_TTL.SHORT);
        }
        return {
            success: true,
            data: documents,
            message: 'Resources retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve resources',
            errors: [error.message]
        };
    }
};
exports.findDocuments = findDocuments;
/**
 * Count documents
 */
const countDocuments = async (model, query = {}) => {
    try {
        const count = await model.countDocuments(query);
        return {
            success: true,
            data: count,
            message: 'Count retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to count resources',
            errors: [error.message]
        };
    }
};
exports.countDocuments = countDocuments;
/**
 * Update a document by ID
 */
const updateDocumentById = async (model, id, data, options = {}) => {
    try {
        const query = model.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true, runValidators: true });
        if (options.populate) {
            query.populate(options.populate);
        }
        if (options.lean) {
            query.lean();
        }
        const updatedDocument = await query.exec();
        if (!updatedDocument) {
            return {
                success: false,
                message: 'Resource not found',
                errors: ['Document with the given ID does not exist']
            };
        }
        // Invalidate cache
        if (options.useCache !== false) {
            await (0, exports.invalidateRelatedCache)(model.modelName.toLowerCase());
        }
        return {
            success: true,
            data: updatedDocument,
            message: 'Resource updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to update resource',
            errors: [error.message]
        };
    }
};
exports.updateDocumentById = updateDocumentById;
/**
 * Delete a document by ID
 */
const deleteDocumentById = async (model, id, options = {}) => {
    try {
        const deletedDocument = await model.findByIdAndDelete(id);
        if (!deletedDocument) {
            return {
                success: false,
                message: 'Resource not found',
                errors: ['Document with the given ID does not exist']
            };
        }
        // Invalidate cache
        if (options.useCache !== false) {
            await (0, exports.invalidateRelatedCache)(model.modelName.toLowerCase());
        }
        return {
            success: true,
            data: true,
            message: 'Resource deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to delete resource',
            errors: [error.message]
        };
    }
};
exports.deleteDocumentById = deleteDocumentById;
/**
 * Check if a document exists
 */
const documentExists = async (model, query) => {
    try {
        const exists = await model.exists(query);
        return {
            success: true,
            data: !!exists,
            message: exists ? 'Resource exists' : 'Resource does not exist'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to check resource existence',
            errors: [error.message]
        };
    }
};
exports.documentExists = documentExists;
/**
 * Get paginated results
 */
const findPaginatedDocuments = async (model, queryBuilder, page = 1, limit = 10, options = {}) => {
    try {
        // Get total count
        const { query } = (0, queryBuilder_1.buildQuery)(queryBuilder);
        const countResult = await (0, exports.countDocuments)(model, query);
        if (!countResult.success) {
            return countResult;
        }
        const total = countResult.data;
        const totalPages = Math.ceil(total / limit);
        // Get paginated data
        const paginatedBuilder = {
            ...queryBuilder,
            options: {
                ...queryBuilder.options,
                page,
                limit,
                skip: (page - 1) * limit
            }
        };
        const dataResult = await (0, exports.findDocuments)(model, paginatedBuilder, options);
        if (!dataResult.success) {
            return dataResult;
        }
        return {
            success: true,
            data: {
                data: dataResult.data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            },
            message: 'Paginated resources retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve paginated resources',
            errors: [error.message]
        };
    }
};
exports.findPaginatedDocuments = findPaginatedDocuments;
/**
 * Invalidate related cache entries
 */
const invalidateRelatedCache = async (modelName) => {
    try {
        await (0, cache_1.invalidateCache)(`${modelName}:*`);
    }
    catch (error) {
        console.error('Failed to invalidate cache:', error);
    }
};
exports.invalidateRelatedCache = invalidateRelatedCache;
/**
 * Create a service factory for a specific model
 */
const createServiceFactory = (model, cachePrefix) => {
    return {
        create: (data, options) => (0, exports.createDocument)(model, data, options),
        findById: (id, options) => (0, exports.findDocumentById)(model, id, options),
        find: (queryBuilder, options) => (0, exports.findDocuments)(model, queryBuilder, options),
        count: (query) => (0, exports.countDocuments)(model, query),
        updateById: (id, data, options) => (0, exports.updateDocumentById)(model, id, data, options),
        deleteById: (id, options) => (0, exports.deleteDocumentById)(model, id, options),
        exists: (query) => (0, exports.documentExists)(model, query),
        findPaginated: (queryBuilder, page, limit, options) => (0, exports.findPaginatedDocuments)(model, queryBuilder, page, limit, options),
        invalidateCache: () => (0, exports.invalidateRelatedCache)(cachePrefix)
    };
};
exports.createServiceFactory = createServiceFactory;
//# sourceMappingURL=serviceHelpers.js.map