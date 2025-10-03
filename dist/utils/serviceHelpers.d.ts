import { Document, Model, Types } from 'mongoose';
import { ServiceResponse } from '../@types/api';
import { QueryBuilderState } from './queryBuilder';
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
export declare const createDocument: <T extends BaseEntity>(model: Model<T>, data: Partial<T>, options?: ServiceOptions) => Promise<ServiceResponse<T>>;
/**
 * Find a document by ID
 */
export declare const findDocumentById: <T extends BaseEntity>(model: Model<T>, id: string | Types.ObjectId, options?: ServiceOptions) => Promise<ServiceResponse<T | null>>;
/**
 * Find documents with query builder
 */
export declare const findDocuments: <T extends BaseEntity>(model: Model<T>, queryBuilder: QueryBuilderState, options?: ServiceOptions) => Promise<ServiceResponse<T[]>>;
/**
 * Count documents
 */
export declare const countDocuments: <T extends BaseEntity>(model: Model<T>, query?: any) => Promise<ServiceResponse<number>>;
/**
 * Update a document by ID
 */
export declare const updateDocumentById: <T extends BaseEntity>(model: Model<T>, id: string | Types.ObjectId, data: Partial<T>, options?: ServiceOptions) => Promise<ServiceResponse<T | null>>;
/**
 * Delete a document by ID
 */
export declare const deleteDocumentById: <T extends BaseEntity>(model: Model<T>, id: string | Types.ObjectId, options?: ServiceOptions) => Promise<ServiceResponse<boolean>>;
/**
 * Check if a document exists
 */
export declare const documentExists: <T extends BaseEntity>(model: Model<T>, query: any) => Promise<ServiceResponse<boolean>>;
/**
 * Get paginated results
 */
export declare const findPaginatedDocuments: <T extends BaseEntity>(model: Model<T>, queryBuilder: QueryBuilderState, page?: number, limit?: number, options?: ServiceOptions) => Promise<ServiceResponse<{
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>>;
/**
 * Invalidate related cache entries
 */
export declare const invalidateRelatedCache: (modelName: string) => Promise<void>;
/**
 * Create a service factory for a specific model
 */
export declare const createServiceFactory: <T extends BaseEntity>(model: Model<T>, cachePrefix: string) => {
    create: (data: Partial<T>, options?: ServiceOptions) => Promise<ServiceResponse<T>>;
    findById: (id: string | Types.ObjectId, options?: ServiceOptions) => Promise<ServiceResponse<T | null>>;
    find: (queryBuilder: QueryBuilderState, options?: ServiceOptions) => Promise<ServiceResponse<T[]>>;
    count: (query?: any) => Promise<ServiceResponse<number>>;
    updateById: (id: string | Types.ObjectId, data: Partial<T>, options?: ServiceOptions) => Promise<ServiceResponse<T | null>>;
    deleteById: (id: string | Types.ObjectId, options?: ServiceOptions) => Promise<ServiceResponse<boolean>>;
    exists: (query: any) => Promise<ServiceResponse<boolean>>;
    findPaginated: (queryBuilder: QueryBuilderState, page?: number, limit?: number, options?: ServiceOptions) => Promise<ServiceResponse<{
        data: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>>;
    invalidateCache: () => Promise<void>;
};
//# sourceMappingURL=serviceHelpers.d.ts.map