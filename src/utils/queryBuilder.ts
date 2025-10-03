// Query builder utility for MongoDB operations

import { Types } from 'mongoose';
import { QueryOptions } from '../@types/api';

export interface QueryBuilderState {
  query: any;
  options: QueryOptions;
}

/**
 * Create a new query builder state
 */
export const createQueryBuilder = (baseQuery: any = {}): QueryBuilderState => ({
  query: { ...baseQuery },
  options: {}
});

/**
 * Add pagination to query
 */
export const addPagination = (
  builder: QueryBuilderState,
  page: number = 1,
  limit: number = 10
): QueryBuilderState => {
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

/**
 * Add search functionality
 */
export const addSearch = (
  builder: QueryBuilderState,
  fields: string[],
  searchTerm?: string
): QueryBuilderState => {
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

/**
 * Add text search
 */
export const addTextSearch = (
  builder: QueryBuilderState,
  searchTerm?: string
): QueryBuilderState => {
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

/**
 * Add filters
 */
export const addFilters = (
  builder: QueryBuilderState,
  filters: Record<string, any>
): QueryBuilderState => {
  const validFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  return {
    ...builder,
    query: {
      ...builder.query,
      ...validFilters
    }
  };
};

/**
 * Add range filter
 */
export const addRange = (
  builder: QueryBuilderState,
  field: string,
  min?: number,
  max?: number
): QueryBuilderState => {
  if (min !== undefined || max !== undefined) {
    const rangeQuery: any = {};
    if (min !== undefined) rangeQuery.$gte = min;
    if (max !== undefined) rangeQuery.$lte = max;
    
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

/**
 * Add date range filter
 */
export const addDateRange = (
  builder: QueryBuilderState,
  field: string,
  startDate?: Date,
  endDate?: Date
): QueryBuilderState => {
  if (startDate || endDate) {
    const dateQuery: any = {};
    if (startDate) dateQuery.$gte = startDate;
    if (endDate) dateQuery.$lte = endDate;
    
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

/**
 * Add sorting
 */
export const addSort = (
  builder: QueryBuilderState,
  sortBy?: string,
  order: 'asc' | 'desc' = 'desc'
): QueryBuilderState => {
  if (sortBy) {
    return {
      ...builder,
      options: {
        ...builder.options,
        sort: { [sortBy]: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>
      }
    };
  }
  return builder;
};

/**
 * Add field selection
 */
export const addSelect = (
  builder: QueryBuilderState,
  fields: string
): QueryBuilderState => ({
  ...builder,
  options: {
    ...builder.options,
    select: fields
  }
});

/**
 * Add population
 */
export const addPopulate = (
  builder: QueryBuilderState,
  populateFields: string | string[]
): QueryBuilderState => ({
  ...builder,
  options: {
    ...builder.options,
    populate: populateFields
  }
});

/**
 * Add lean option
 */
export const addLean = (
  builder: QueryBuilderState,
  lean: boolean = true
): QueryBuilderState => ({
  ...builder,
  options: {
    ...builder.options,
    lean
  }
});

/**
 * Add ObjectId filter
 */
export const addObjectId = (
  builder: QueryBuilderState,
  field: string,
  value: string | Types.ObjectId
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: new Types.ObjectId(value)
  }
});

/**
 * Add array contains filter
 */
export const addInArray = (
  builder: QueryBuilderState,
  field: string,
  values: (string | Types.ObjectId)[]
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: { $in: values.map(v => new Types.ObjectId(v)) }
  }
});

/**
 * Add exists filter
 */
export const addExists = (
  builder: QueryBuilderState,
  field: string,
  exists: boolean = true
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: { $exists: exists }
  }
});

/**
 * Add not equal filter
 */
export const addNotEqual = (
  builder: QueryBuilderState,
  field: string,
  value: any
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: { $ne: value }
  }
});

/**
 * Add greater than filter
 */
export const addGreaterThan = (
  builder: QueryBuilderState,
  field: string,
  value: number | Date
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: { $gt: value }
  }
});

/**
 * Add less than filter
 */
export const addLessThan = (
  builder: QueryBuilderState,
  field: string,
  value: number | Date
): QueryBuilderState => ({
  ...builder,
  query: {
    ...builder.query,
    [field]: { $lt: value }
  }
});

/**
 * Build the final query
 */
export const buildQuery = (builder: QueryBuilderState): { query: any; options: QueryOptions } => ({
  query: builder.query,
  options: builder.options
});

/**
 * Reset the builder
 */
export const resetBuilder = (): QueryBuilderState => ({
  query: {},
  options: {}
});

/**
 * Chain multiple query operations
 */
export const chainQueryOperations = (
  builder: QueryBuilderState,
  operations: Array<(builder: QueryBuilderState) => QueryBuilderState>
): QueryBuilderState => {
  return operations.reduce((acc, operation) => operation(acc), builder);
};
