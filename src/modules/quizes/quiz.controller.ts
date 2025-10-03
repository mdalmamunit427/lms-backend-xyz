// src/modules/quizes/quiz.controller.ts

import { Request, Response, NextFunction } from "express";
import * as quizService from "./quiz.service";
import { AppError } from "../../utils/errorHandler";
import { ICreateQuizBody, IUpdateQuizBody, ISubmitQuizAttemptBody } from "./quiz.validation";
import { UserRole } from "../../utils/ownership";
import { catchAsync } from "../../middlewares/catchAsync";
import { getUserId, getUserRole } from "../../utils/common";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth";

// --- Type Definitions ---
interface QuizAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        id?: string;
        chapterId?: string;
        courseId?: string;
    };
    body: any; 
}

// --- CONTROLLER HANDLERS ---

export const createQuizHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const result = await quizService.createQuizService(
        req.body as ICreateQuizBody, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Quiz creation failed', 400, result.errors);
    }
    
    return sendCreated(res, result.data, 'Quiz created successfully');
});

export const updateQuizHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;
    
    if (!req.params.id) {
        return sendError(res, 'Quiz ID missing', 400);
    }

    const result = await quizService.updateQuizService(
        req.params.id, 
        req.body as IUpdateQuizBody,
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Quiz update failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Quiz updated successfully');
});

export const deleteQuizHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;
    
    if (!req.params.id) {
        return sendError(res, 'Quiz ID missing', 400);
    }

    const result = await quizService.deleteQuizService(
        req.params.id, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Quiz deletion failed', 400, result.errors);
    }
    
    return sendSuccess(res, undefined, 'Quiz deleted successfully');
});

export const getQuizHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }
    
    // Check if user is enrolled to determine if answers should be included
    const userRole = getUserRole(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;

    const result = await quizService.getQuizByIdService(req.params.id!, cacheKey, isEnrolled);

    if (!result.success) {
        return sendError(res, result.message || 'Quiz not found', 404, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Quiz retrieved successfully', 200, { cached: !!cacheKey });
});

export const getQuizzesByChapterHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const userRole = getUserRole(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;

    const result = await quizService.getQuizzesByChapterService(req.params.chapterId!, cacheKey, isEnrolled);
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve quizzes', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Quizzes retrieved successfully', 200, { cached: !!cacheKey });
});

export const getCourseQuizzesHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const userRole = getUserRole(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;

    const result = await quizService.getCourseQuizzesService(req.params.courseId!, cacheKey, isEnrolled);
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve course quizzes', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Course quizzes retrieved successfully', 200, { cached: !!cacheKey });
});

export const submitQuizAttemptHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const userId = getUserId(req);
    
    if (!req.params.id) {
        return sendError(res, 'Quiz ID missing', 400);
    }

    const result = await quizService.submitQuizAttemptService(
        userId,
        req.params.id,
        req.body as ISubmitQuizAttemptBody
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Quiz submission failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Quiz submitted successfully');
});

export const getQuizResultsHandler = catchAsync(async (req: QuizAuthRequest, res: Response) => {
    const userId = getUserId(req);
    
    if (!req.params.courseId) {
        return sendError(res, 'Course ID missing', 400);
    }

    const result = await quizService.getQuizResultsService(
        userId,
        req.params.courseId
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve quiz results', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Quiz results retrieved successfully');
});
