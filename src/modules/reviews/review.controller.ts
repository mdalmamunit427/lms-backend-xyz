// src/modules/reviews/review.controller.ts

import { Request, Response, NextFunction } from "express";
import * as reviewService from "./review.service";
import { AppError } from "../../utils/errorHandler";
import { ICreateReviewBody, IUpdateReviewBody } from "./review.validation";
import { UserRole } from "../../utils/ownership";
import { catchAsync } from "../../middlewares/catchAsync";
import { getUserId, getUserRole, getPaginationParams } from "../../utils/common";
import { sendSuccess, sendCreated, sendError, sendPaginated } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth";

// --- Type Definitions ---
interface ReviewAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        id?: string;
        courseId?: string;
    };
    query: {
        page?: string;
        limit?: string;
        sortBy?: string;
        sortOrder?: string;
    };
    body: any; 
}

// --- CONTROLLER HANDLERS ---

export const createReviewHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const userId = getUserId(req);

    const { course, rating, comment } = req.body as ICreateReviewBody;
    const result = await reviewService.createReviewService(
        userId, 
        course, 
        rating, 
        comment
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Review creation failed', 400, result.errors);
    }
    
    return sendCreated(res, result.data, 'Review created successfully');
});

export const updateReviewHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const userId = getUserId(req);
    
    if (!req.params.id) {
        return sendError(res, 'Review ID missing', 400);
    }

    const { rating, comment } = req.body as IUpdateReviewBody;
    const result = await reviewService.updateReviewService(
        req.params.id, 
        userId, 
        rating, 
        comment
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Review update failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Review updated successfully');
});

export const deleteReviewHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const userId = getUserId(req);
    
    if (!req.params.id) {
        return sendError(res, 'Review ID missing', 400);
    }

    const result = await reviewService.deleteReviewService(req.params.id, userId);
    
    if (!result.success) {
        return sendError(res, result.message || 'Review deletion failed', 400, result.errors);
    }
    
    return sendSuccess(res, undefined, 'Review deleted successfully');
});

export const getReviewHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const result = await reviewService.getReviewByIdService(req.params.id!, cacheKey);
    
    if (!result.success) {
        return sendError(res, result.message || 'Review not found', 404, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Review retrieved successfully', 200, { cached: !!cacheKey });
});

export const getCourseReviewsHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const { page, limit } = getPaginationParams(req);
    const sortBy = req.query.sortBy as 'rating' | 'createdAt' || 'createdAt';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    
    const options = {
        page,
        limit,
        sortBy,
        sortOrder
    };

    const result = await reviewService.getCourseReviewsService(
        req.params.courseId!, 
        options, 
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve course reviews', 500, result.errors);
    }
    
    const { data, pagination } = result.data!;
    return sendPaginated(res, data, pagination, 'Course reviews retrieved successfully', !!cacheKey);
});

export const getUserReviewsHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const userId = getUserId(req);

    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const { page, limit } = getPaginationParams(req);
    const options = {
        page,
        limit
    };

    const result = await reviewService.getUserReviewsService(
        userId, 
        options, 
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve user reviews', 500, result.errors);
    }
    
    const { data, pagination } = result.data!;
    return sendPaginated(res, data, pagination, 'User reviews retrieved successfully', !!cacheKey);
});

export const getCourseReviewStatsHandler = catchAsync(async (req: ReviewAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const result = await reviewService.getCourseReviewStatsService(
        req.params.courseId!, 
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve review stats', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Review stats retrieved successfully', 200, { cached: !!cacheKey });
});
