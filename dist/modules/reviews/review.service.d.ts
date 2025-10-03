import { IReview } from "./review.model";
import { ServiceResponse } from "../../@types/api";
/**
 * Create a new review
 */
export declare const createReviewService: (userId: string, courseId: string, rating: number, comment?: string) => Promise<ServiceResponse<IReview>>;
/**
 * Update review
 */
export declare const updateReviewService: (reviewId: string, userId: string, rating?: number, comment?: string) => Promise<ServiceResponse<IReview>>;
/**
 * Delete review
 */
export declare const deleteReviewService: (reviewId: string, userId: string) => Promise<ServiceResponse<any>>;
/**
 * Get review by ID with caching
 */
export declare const getReviewByIdService: (id: string, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get course reviews with caching
 */
export declare const getCourseReviewsService: (courseId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get user reviews with caching
 */
export declare const getUserReviewsService: (userId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get course review statistics with caching
 */
export declare const getCourseReviewStatsService: (courseId: string, cacheKey: string) => Promise<ServiceResponse<any>>;
//# sourceMappingURL=review.service.d.ts.map