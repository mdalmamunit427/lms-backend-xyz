// src/modules/reviews/review.service.ts

import mongoose, { Types } from 'mongoose';
import { AppError } from "../../utils/errorHandler";
import { createError } from "../../utils/errorHandler";
import { withTransaction } from "../../utils/withTransaction";
import { invalidateCache, setCache } from "../../utils/cache";
import Review, { IReview } from "./review.model";
import Course from "../courses/course.model";
import Enrollment from "../enrollments/enrollment.model";
import { ICreateReviewBody, IUpdateReviewBody } from "./review.validation";
import { createNotification } from "../notifications/notification.service";
import { ServiceResponse } from "../../@types/api";

const REVIEW_CACHE_BASE = 'reviews';

// --- CORE SERVICE FUNCTIONS ---

/**
 * Create a new review
 */
export const createReviewService = async (
  userId: string, 
  courseId: string, 
  rating: number, 
  comment?: string
): Promise<ServiceResponse<IReview>> => {
    try {
        const review = await withTransaction(async (session) => {
            // 1. Check if user is enrolled
            const enrollment = await Enrollment.findOne({ 
                student: userId, 
                course: courseId 
            }).session(session);
            
            if (!enrollment) {
                throw createError('Must be enrolled to review course', 400);
            }
            
            // 2. Check if already reviewed
            const existingReview = await Review.findOne({ 
                user: userId, 
                course: courseId 
            }).session(session);
            
            if (existingReview) {
                throw createError('Already reviewed this course', 400);
            }
            
            // 3. Create review
            const [review] = await Review.create([{
                user: userId,
                course: courseId,
                rating,
                comment
            }], { session, ordered: true });

            if (!review) throw createError("Failed to create review.", 500);
            
            // 4. Update course average rating
            await updateCourseRating(courseId, session);
            
            // 5. Notify instructor
            const course = await Course.findById(courseId).session(session);
            if (course) {
                await createNotification(
                    course.instructor.toString(),
                    'new_review',
                    `New ${rating}-star review received for ${course.title}`,
                    courseId
                );
            }
            
            // 6. Invalidate caches
            await invalidateCache(`${REVIEW_CACHE_BASE}:${review._id}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:courseId=${courseId}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:user=${userId}`);
            await invalidateCache(`review-stats:courseId=${courseId}`);
            await invalidateCache(`course:id=${courseId}`);
            
            return review.populate('user', 'name avatar');
        });

        return {
            success: true,
            data: review,
            message: 'Review created successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Review creation failed',
            errors: [error.message]
        };
    }
};

/**
 * Update review
 */
export const updateReviewService = async (
  reviewId: string, 
  userId: string, 
  rating?: number, 
  comment?: string
): Promise<ServiceResponse<IReview>> => {
    try {
        const review = await withTransaction(async (session) => {
            const review = await Review.findOne({ _id: reviewId, user: userId }).session(session);
            if (!review) throw new AppError('Review not found or unauthorized', 404);
            
            // Update fields
            if (rating !== undefined) review.rating = rating;
            if (comment !== undefined) review.comment = comment;
            
            await review.save({ session });
            
            // Update course rating
            await updateCourseRating(review.course.toString(), session);
            
            // Invalidate caches
            await invalidateCache(`${REVIEW_CACHE_BASE}:${reviewId}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:courseId=${review.course}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:user=${userId}`);
            await invalidateCache(`review-stats:courseId=${review.course}`);
            await invalidateCache(`course:id=${review.course}`);
            
            return review.populate('user', 'name avatar');
        });

        return {
            success: true,
            data: review,
            message: 'Review updated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Review update failed',
            errors: [error.message]
        };
    }
};

/**
 * Delete review
 */
export const deleteReviewService = async (reviewId: string, userId: string): Promise<ServiceResponse<any>> => {
    try {
        await withTransaction(async (session) => {
            const review = await Review.findOneAndDelete({ _id: reviewId, user: userId }, { session });
            if (!review) throw new AppError('Review not found or unauthorized', 404);
            
            // Update course rating
            await updateCourseRating(review.course.toString(), session);
            
            // Invalidate caches
            await invalidateCache(`${REVIEW_CACHE_BASE}:${reviewId}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:courseId=${review.course}`);
            await invalidateCache(`${REVIEW_CACHE_BASE}:user=${userId}`);
            await invalidateCache(`review-stats:courseId=${review.course}`);
            await invalidateCache(`course:id=${review.course}`);
        });

        return {
            success: true,
            data: undefined,
            message: 'Review deleted successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Review deletion failed',
            errors: [error.message]
        };
    }
};

/**
 * Get review by ID with caching
 */
export const getReviewByIdService = async (id: string, cacheKey: string): Promise<ServiceResponse<any>> => {
    try {
        const review = await Review.findById(id)
            .populate('user', 'name avatar')
            .populate('course', 'title thumbnail')
            .lean();
            
        if (!review) {
            return {
                success: false,
                message: 'Review not found',
                errors: ['No review found with the provided ID']
            };
        }
        
        const responseData = { review, cached: false };
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Review retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve review',
            errors: [error.message]
        };
    }
};

/**
 * Get course reviews with caching
 */
export const getCourseReviewsService = async (
  courseId: string, 
  options: any = {}, 
  cacheKey: string
): Promise<ServiceResponse<any>> => {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const skip = (page - 1) * limit;
        
        const sortObj: any = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const reviews = await Review.find({ course: courseId })
            .populate('user', 'name avatar')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Review.countDocuments({ course: courseId });
        
        const responseData = {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            cached: false
        };
        
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Course reviews retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve course reviews',
            errors: [error.message]
        };
    }
};

/**
 * Get user reviews with caching
 */
export const getUserReviewsService = async (
  userId: string, 
  options: any = {}, 
  cacheKey: string
): Promise<ServiceResponse<any>> => {
    try {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ user: userId })
            .populate('course', 'title thumbnail instructor')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Review.countDocuments({ user: userId });
        
        const responseData = {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            cached: false
        };
        
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'User reviews retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve user reviews',
            errors: [error.message]
        };
    }
};

/**
 * Get course review statistics with caching
 */
export const getCourseReviewStatsService = async (courseId: string, cacheKey: string): Promise<ServiceResponse<any>> => {
    try {
        const reviews = await Review.find({ course: courseId }).lean();
        
        if (reviews.length === 0) {
            const stats = {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
            const responseData = { stats, cached: false };
            await setCache(cacheKey, responseData);
            
            return {
                success: true,
                data: responseData,
                message: 'Review stats retrieved successfully'
            };
        }
        
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        const ratingDistribution = reviews.reduce((acc, review) => {
            acc[review.rating] = (acc[review.rating] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
        
        // Ensure all rating levels are present
        for (let i = 1; i <= 5; i++) {
            if (!ratingDistribution[i]) ratingDistribution[i] = 0;
        }
        
        const stats = {
            totalReviews: reviews.length,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingDistribution
        };
        
        const responseData = { stats, cached: false };
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Review stats retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve review stats',
            errors: [error.message]
        };
    }
};

/**
 * Update course rating (internal helper)
 */
const updateCourseRating = async (courseId: string, session?: mongoose.ClientSession): Promise<void> => {
  const reviews = await Review.find({ course: courseId }).session(session || null);
  
  if (reviews.length === 0) {
    await Course.findByIdAndUpdate(courseId, {
      averageRating: 0,
      reviewCount: 0
    }, { session });
    return;
  }
  
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  
  await Course.findByIdAndUpdate(courseId, {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount: reviews.length
  }, { session });
};