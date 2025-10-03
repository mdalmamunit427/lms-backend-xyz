import { ClientSession } from 'mongoose';
import { IReview } from './review.model';
export type ReviewQueryOptions = {
    page?: number;
    limit?: number;
    userId?: string;
    courseId?: string;
    rating?: number;
    sortBy?: 'rating' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
};
export declare const findReviewById: (reviewId: string, session?: ClientSession) => Promise<IReview | null>;
export declare const findReviewByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<IReview | null>;
export declare const findReviewsByCourse: (courseId: string, options?: ReviewQueryOptions, session?: ClientSession) => Promise<IReview[]>;
export declare const findReviewsByUser: (userId: string, options?: ReviewQueryOptions, session?: ClientSession) => Promise<IReview[]>;
export declare const findReviewsByRating: (courseId: string, rating: number, session?: ClientSession) => Promise<IReview[]>;
export declare const countReviewsByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const countReviewsByUser: (userId: string, session?: ClientSession) => Promise<number>;
export declare const createReview: (data: Partial<IReview>, session?: ClientSession) => Promise<IReview>;
export declare const updateReviewById: (reviewId: string, updateData: Partial<IReview>, session?: ClientSession) => Promise<IReview | null>;
export declare const deleteReviewById: (reviewId: string, session?: ClientSession) => Promise<IReview | null>;
export declare const deleteReviewByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<IReview | null>;
export declare const bulkDeleteReviewsByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteReviewsByUser: (userId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateCourseReviewStats: (courseId: string) => Promise<any>;
export declare const aggregateInstructorReviewStats: (instructorId: string) => Promise<any>;
export declare const aggregateRecentReviews: (limit?: number) => Promise<any>;
//# sourceMappingURL=review.repository.d.ts.map