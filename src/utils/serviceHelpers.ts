// Functional service helper utilities

import { Document, Model, Types } from 'mongoose';
import { getCache, setCache, invalidateCache } from './cache';
import { CACHE_TTL } from './constants';
import { ServiceResponse, QueryOptions } from '../@types/api';
import { QueryBuilderState, buildQuery } from './queryBuilder';

export interface BaseEntity extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceOptions {
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  populate?: string | string[];
  lean?: boolean;
}

/**
 * Create a new document
 */
export const createDocument = async <T extends BaseEntity>(
  model: Model<T>,
  data: Partial<T>,
  options: ServiceOptions = {}
): Promise<ServiceResponse<T>> => {
  try {
    const document = new model(data);
    const savedDocument = await document.save();
    
    if (options.useCache && options.cacheKey) {
      await invalidateRelatedCache(model.modelName.toLowerCase());
    }

    return {
      success: true,
      data: savedDocument,
      message: 'Resource created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create resource',
      errors: [error.message]
    };
  }
};

/**
 * Find a document by ID
 */
export const findDocumentById = async <T extends BaseEntity>(
  model: Model<T>,
  id: string | Types.ObjectId,
  options: ServiceOptions = {}
): Promise<ServiceResponse<T | null>> => {
  try {
    const cacheKey = options.cacheKey || `${model.modelName.toLowerCase()}:${id}`;
    
    // Try cache first
    if (options.useCache !== false) {
      const cached = await getCache<T>(cacheKey);
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
      await setCache(cacheKey, document, options.cacheTTL || CACHE_TTL.MEDIUM);
    }

    return {
      success: true,
      data: document,
      message: document ? 'Resource retrieved successfully' : 'Resource not found'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve resource',
      errors: [error.message]
    };
  }
};

/**
 * Find documents with query builder
 */
export const findDocuments = async <T extends BaseEntity>(
  model: Model<T>,
  queryBuilder: QueryBuilderState,
  options: ServiceOptions = {}
): Promise<ServiceResponse<T[]>> => {
  try {
    const { query, options: queryOptions } = buildQuery(queryBuilder);
    const cacheKey = options.cacheKey || `${model.modelName.toLowerCase()}:list:${JSON.stringify(query)}`;

    // Try cache first
    if (options.useCache !== false) {
      const cached = await getCache<T[]>(cacheKey);
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

    const documents = await mongooseQuery.exec() as T[];

    // Cache the result
    if (options.useCache !== false) {
      await setCache(cacheKey, documents, options.cacheTTL || CACHE_TTL.SHORT);
    }

    return {
      success: true,
      data: documents,
      message: 'Resources retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve resources',
      errors: [error.message]
    };
  }
};

/**
 * Count documents
 */
export const countDocuments = async <T extends BaseEntity>(
  model: Model<T>,
  query: any = {}
): Promise<ServiceResponse<number>> => {
  try {
    const count = await model.countDocuments(query);
    return {
      success: true,
      data: count,
      message: 'Count retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to count resources',
      errors: [error.message]
    };
  }
};

/**
 * Update a document by ID
 */
export const updateDocumentById = async <T extends BaseEntity>(
  model: Model<T>,
  id: string | Types.ObjectId,
  data: Partial<T>,
  options: ServiceOptions = {}
): Promise<ServiceResponse<T | null>> => {
  try {
    const query = model.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

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
      await invalidateRelatedCache(model.modelName.toLowerCase());
    }

    return {
      success: true,
      data: updatedDocument,
      message: 'Resource updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update resource',
      errors: [error.message]
    };
  }
};

/**
 * Delete a document by ID
 */
export const deleteDocumentById = async <T extends BaseEntity>(
  model: Model<T>,
  id: string | Types.ObjectId,
  options: ServiceOptions = {}
): Promise<ServiceResponse<boolean>> => {
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
      await invalidateRelatedCache(model.modelName.toLowerCase());
    }

    return {
      success: true,
      data: true,
      message: 'Resource deleted successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete resource',
      errors: [error.message]
    };
  }
};

/**
 * Check if a document exists
 */
export const documentExists = async <T extends BaseEntity>(
  model: Model<T>,
  query: any
): Promise<ServiceResponse<boolean>> => {
  try {
    const exists = await model.exists(query);
    return {
      success: true,
      data: !!exists,
      message: exists ? 'Resource exists' : 'Resource does not exist'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to check resource existence',
      errors: [error.message]
    };
  }
};

/**
 * Get paginated results
 */
export const findPaginatedDocuments = async <T extends BaseEntity>(
  model: Model<T>,
  queryBuilder: QueryBuilderState,
  page: number = 1,
  limit: number = 10,
  options: ServiceOptions = {}
): Promise<ServiceResponse<{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>> => {
  try {
    // Get total count
    const { query } = buildQuery(queryBuilder);
    const countResult = await countDocuments(model, query);
    
    if (!countResult.success) {
      return countResult as any;
    }

    const total = countResult.data!;
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

    const dataResult = await findDocuments(model, paginatedBuilder, options);

    if (!dataResult.success) {
      return dataResult as any;
    }

    return {
      success: true,
      data: {
        data: dataResult.data!,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      },
      message: 'Paginated resources retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve paginated resources',
      errors: [error.message]
    };
  }
};

/**
 * Invalidate related cache entries
 */
export const invalidateRelatedCache = async (modelName: string): Promise<void> => {
  try {
    await invalidateCache(`${modelName}:*`);
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
};

/**
 * Create a service factory for a specific model
 */
export const createServiceFactory = <T extends BaseEntity>(model: Model<T>, cachePrefix: string) => {
  return {
    create: (data: Partial<T>, options?: ServiceOptions) => 
      createDocument(model, data, options),
    
    findById: (id: string | Types.ObjectId, options?: ServiceOptions) => 
      findDocumentById(model, id, options),
    
    find: (queryBuilder: QueryBuilderState, options?: ServiceOptions) => 
      findDocuments(model, queryBuilder, options),
    
    count: (query?: any) => 
      countDocuments(model, query),
    
    updateById: (id: string | Types.ObjectId, data: Partial<T>, options?: ServiceOptions) => 
      updateDocumentById(model, id, data, options),
    
    deleteById: (id: string | Types.ObjectId, options?: ServiceOptions) => 
      deleteDocumentById(model, id, options),
    
    exists: (query: any) => 
      documentExists(model, query),
    
    findPaginated: (queryBuilder: QueryBuilderState, page?: number, limit?: number, options?: ServiceOptions) => 
      findPaginatedDocuments(model, queryBuilder, page, limit, options),
    
    invalidateCache: () => 
      invalidateRelatedCache(cachePrefix)
  };
};
