// src/modules/chapters/chapter.controller.ts (Refactored with catchAsync)
import { Request, Response, NextFunction } from "express";
import * as chapterService from "./chapter.service";
import { ICreateChapterData, ILectureData, UserRole } from "./chapter.service";
import { catchAsync } from "../../middlewares/catchAsync";
import { AppError } from "../../utils/errorHandler";
import { getUserId, getUserRole } from "../../utils/common";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth";

// --- Type Definitions (Re-used) ---

// Request interface combining Auth and Caching
interface ChapterAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        id?: string;
        courseId?: string;
    };
    body: any; // The validated and flattened body content
}

// --- CONTROLLER HANDLERS (CLEANED WITH CATCHASYNC) ---

export const createChapterHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const result = await chapterService.createChapter(
        req.body as ICreateChapterData, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Chapter creation failed', 400, result.errors);
    }
    
    return sendCreated(res, result.data, 'Chapter created successfully');
});


export const createChapterWithLecturesHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const { chapter, lectures } = req.body; 
    const result = await chapterService.createChapterWithLectures(
      chapter as ICreateChapterData, 
      lectures as ILectureData[],
      userId, 
      userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Chapter with lectures creation failed', 400, result.errors);
    }
    
    return sendCreated(res, result.data, 'Chapter with lectures created successfully');
});


export const updateChapterHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const result = await chapterService.updateChapter(
        req.params.id as string, 
        req.body,
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Chapter update failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Chapter updated successfully');
});

export const deleteChapterHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const result = await chapterService.deleteChapterService(
        req.params.id as string, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Chapter deletion failed', 400, result.errors);
    }
    
    return sendSuccess(res, undefined, 'Chapter and all associated lectures deleted successfully');
});

// Note: Read operations still need explicit checks for cacheKey and 404s.

export const getChaptersHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    // Middleware handles cache hit/stale response; Controller handles cache miss (DB read)
    const cacheKey = req.cacheKey;
    if (!cacheKey) throw new AppError("Cache key missing from request", 500);

    const result = await chapterService.getChaptersByCourse(req.params.courseId as string, cacheKey);
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve chapters', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Chapters retrieved successfully', 200, { cached: !!cacheKey });
});

export const getChapterHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) throw new AppError("Cache key missing from request", 500);

    const result = await chapterService.getChapterById(req.params.id as string, cacheKey);

    if (!result.success) {
        return sendError(res, result.message || 'Chapter not found', 404, result.errors);
    }

    return sendSuccess(res, result.data, 'Chapter retrieved successfully', 200, { cached: !!cacheKey });
});

export const reorderChaptersWithLecturesHandler = catchAsync(async (req: ChapterAuthRequest, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const { courseId, order } = req.body; 
    const result = await chapterService.reorderChaptersWithLectures(
        courseId as string, 
        order,
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Chapter reordering failed', 400, result.errors);
    }
    
    return sendSuccess(res, undefined, 'Chapters reordered successfully');
});