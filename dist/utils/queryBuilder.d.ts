import { Types } from 'mongoose';
import { QueryOptions } from '../@types/api';
export interface QueryBuilderState {
    query: any;
    options: QueryOptions;
}
/**
 * Create a new query builder state
 */
export declare const createQueryBuilder: (baseQuery?: any) => QueryBuilderState;
/**
 * Add pagination to query
 */
export declare const addPagination: (builder: QueryBuilderState, page?: number, limit?: number) => QueryBuilderState;
/**
 * Add search functionality
 */
export declare const addSearch: (builder: QueryBuilderState, fields: string[], searchTerm?: string) => QueryBuilderState;
/**
 * Add text search
 */
export declare const addTextSearch: (builder: QueryBuilderState, searchTerm?: string) => QueryBuilderState;
/**
 * Add filters
 */
export declare const addFilters: (builder: QueryBuilderState, filters: Record<string, any>) => QueryBuilderState;
/**
 * Add range filter
 */
export declare const addRange: (builder: QueryBuilderState, field: string, min?: number, max?: number) => QueryBuilderState;
/**
 * Add date range filter
 */
export declare const addDateRange: (builder: QueryBuilderState, field: string, startDate?: Date, endDate?: Date) => QueryBuilderState;
/**
 * Add sorting
 */
export declare const addSort: (builder: QueryBuilderState, sortBy?: string, order?: "asc" | "desc") => QueryBuilderState;
/**
 * Add field selection
 */
export declare const addSelect: (builder: QueryBuilderState, fields: string) => QueryBuilderState;
/**
 * Add population
 */
export declare const addPopulate: (builder: QueryBuilderState, populateFields: string | string[]) => QueryBuilderState;
/**
 * Add lean option
 */
export declare const addLean: (builder: QueryBuilderState, lean?: boolean) => QueryBuilderState;
/**
 * Add ObjectId filter
 */
export declare const addObjectId: (builder: QueryBuilderState, field: string, value: string | Types.ObjectId) => QueryBuilderState;
/**
 * Add array contains filter
 */
export declare const addInArray: (builder: QueryBuilderState, field: string, values: (string | Types.ObjectId)[]) => QueryBuilderState;
/**
 * Add exists filter
 */
export declare const addExists: (builder: QueryBuilderState, field: string, exists?: boolean) => QueryBuilderState;
/**
 * Add not equal filter
 */
export declare const addNotEqual: (builder: QueryBuilderState, field: string, value: any) => QueryBuilderState;
/**
 * Add greater than filter
 */
export declare const addGreaterThan: (builder: QueryBuilderState, field: string, value: number | Date) => QueryBuilderState;
/**
 * Add less than filter
 */
export declare const addLessThan: (builder: QueryBuilderState, field: string, value: number | Date) => QueryBuilderState;
/**
 * Build the final query
 */
export declare const buildQuery: (builder: QueryBuilderState) => {
    query: any;
    options: QueryOptions;
};
/**
 * Reset the builder
 */
export declare const resetBuilder: () => QueryBuilderState;
/**
 * Chain multiple query operations
 */
export declare const chainQueryOperations: (builder: QueryBuilderState, operations: Array<(builder: QueryBuilderState) => QueryBuilderState>) => QueryBuilderState;
//# sourceMappingURL=queryBuilder.d.ts.map