"use strict";
// Query builder utility for MongoDB operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainQueryOperations = exports.resetBuilder = exports.buildQuery = exports.addLessThan = exports.addGreaterThan = exports.addNotEqual = exports.addExists = exports.addInArray = exports.addObjectId = exports.addLean = exports.addPopulate = exports.addSelect = exports.addSort = exports.addDateRange = exports.addRange = exports.addFilters = exports.addTextSearch = exports.addSearch = exports.addPagination = exports.createQueryBuilder = void 0;
const mongoose_1 = require("mongoose");
/**
 * Create a new query builder state
 */
const createQueryBuilder = (baseQuery = {}) => ({
    query: { ...baseQuery },
    options: {}
});
exports.createQueryBuilder = createQueryBuilder;
/**
 * Add pagination to query
 */
const addPagination = (builder, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return {
        ...builder,
        options: {
            ...builder.options,
            page,
            limit,
            skip
        }
    };
};
exports.addPagination = addPagination;
/**
 * Add search functionality
 */
const addSearch = (builder, fields, searchTerm) => {
    if (searchTerm && searchTerm.trim()) {
        const searchRegex = { $regex: searchTerm.trim(), $options: 'i' };
        const searchConditions = fields.map(field => ({ [field]: searchRegex }));
        return {
            ...builder,
            query: {
                ...builder.query,
                $or: searchConditions
            }
        };
    }
    return builder;
};
exports.addSearch = addSearch;
/**
 * Add text search
 */
const addTextSearch = (builder, searchTerm) => {
    if (searchTerm && searchTerm.trim()) {
        return {
            ...builder,
            query: {
                ...builder.query,
                $text: { $search: searchTerm.trim() }
            }
        };
    }
    return builder;
};
exports.addTextSearch = addTextSearch;
/**
 * Add filters
 */
const addFilters = (builder, filters) => {
    const validFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
    return {
        ...builder,
        query: {
            ...builder.query,
            ...validFilters
        }
    };
};
exports.addFilters = addFilters;
/**
 * Add range filter
 */
const addRange = (builder, field, min, max) => {
    if (min !== undefined || max !== undefined) {
        const rangeQuery = {};
        if (min !== undefined)
            rangeQuery.$gte = min;
        if (max !== undefined)
            rangeQuery.$lte = max;
        return {
            ...builder,
            query: {
                ...builder.query,
                [field]: rangeQuery
            }
        };
    }
    return builder;
};
exports.addRange = addRange;
/**
 * Add date range filter
 */
const addDateRange = (builder, field, startDate, endDate) => {
    if (startDate || endDate) {
        const dateQuery = {};
        if (startDate)
            dateQuery.$gte = startDate;
        if (endDate)
            dateQuery.$lte = endDate;
        return {
            ...builder,
            query: {
                ...builder.query,
                [field]: dateQuery
            }
        };
    }
    return builder;
};
exports.addDateRange = addDateRange;
/**
 * Add sorting
 */
const addSort = (builder, sortBy, order = 'desc') => {
    if (sortBy) {
        return {
            ...builder,
            options: {
                ...builder.options,
                sort: { [sortBy]: order === 'asc' ? 1 : -1 }
            }
        };
    }
    return builder;
};
exports.addSort = addSort;
/**
 * Add field selection
 */
const addSelect = (builder, fields) => ({
    ...builder,
    options: {
        ...builder.options,
        select: fields
    }
});
exports.addSelect = addSelect;
/**
 * Add population
 */
const addPopulate = (builder, populateFields) => ({
    ...builder,
    options: {
        ...builder.options,
        populate: populateFields
    }
});
exports.addPopulate = addPopulate;
/**
 * Add lean option
 */
const addLean = (builder, lean = true) => ({
    ...builder,
    options: {
        ...builder.options,
        lean
    }
});
exports.addLean = addLean;
/**
 * Add ObjectId filter
 */
const addObjectId = (builder, field, value) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: new mongoose_1.Types.ObjectId(value)
    }
});
exports.addObjectId = addObjectId;
/**
 * Add array contains filter
 */
const addInArray = (builder, field, values) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: { $in: values.map(v => new mongoose_1.Types.ObjectId(v)) }
    }
});
exports.addInArray = addInArray;
/**
 * Add exists filter
 */
const addExists = (builder, field, exists = true) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: { $exists: exists }
    }
});
exports.addExists = addExists;
/**
 * Add not equal filter
 */
const addNotEqual = (builder, field, value) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: { $ne: value }
    }
});
exports.addNotEqual = addNotEqual;
/**
 * Add greater than filter
 */
const addGreaterThan = (builder, field, value) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: { $gt: value }
    }
});
exports.addGreaterThan = addGreaterThan;
/**
 * Add less than filter
 */
const addLessThan = (builder, field, value) => ({
    ...builder,
    query: {
        ...builder.query,
        [field]: { $lt: value }
    }
});
exports.addLessThan = addLessThan;
/**
 * Build the final query
 */
const buildQuery = (builder) => ({
    query: builder.query,
    options: builder.options
});
exports.buildQuery = buildQuery;
/**
 * Reset the builder
 */
const resetBuilder = () => ({
    query: {},
    options: {}
});
exports.resetBuilder = resetBuilder;
/**
 * Chain multiple query operations
 */
const chainQueryOperations = (builder, operations) => {
    return operations.reduce((acc, operation) => operation(acc), builder);
};
exports.chainQueryOperations = chainQueryOperations;
//# sourceMappingURL=queryBuilder.js.map