// src/modules/lectures/lecture.controller.ts

import { Request, Response, NextFunction } from "express";
import * as lectureService from "./lecture.service";
import { AppError } from "../../utils/errorHandler";
import { ICreateLectureBody, IUpdateLectureBody } from "./lecture.validation";
import { UserRole } from "../../utils/ownership";
import { catchAsync } from "../../middlewares/catchAsync";
import { getUserId, getUserRole } from "../../utils/common";
import { sendSuccess, sendCreated, sendError } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth";

// --- Type Definitions ---
interface LectureAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        id?: string;
        chapterId?: string;
    };
    body: any; 
}

// --- CONTROLLER HANDLERS ---

export const createLectureHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const result = await lectureService.createLectureService(
        req.body as ICreateLectureBody, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Lecture creation failed', 400, result.errors);
    }
    
    return sendCreated(res, result.data, 'Lecture created successfully');
});

export const updateLectureHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;
    
    if (!req.params.id) {
        return sendError(res, 'Lecture ID missing', 400);
    }

    const result = await lectureService.updateLectureService(
        req.params.id, 
        req.body as IUpdateLectureBody,
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Lecture update failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Lecture updated successfully');
});

export const deleteLectureHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;
    
    if (!req.params.id) {
        return sendError(res, 'Lecture ID missing', 400);
    }

    const result = await lectureService.deleteLectureService(
        req.params.id, 
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Lecture deletion failed', 400, result.errors);
    }
    
    return sendSuccess(res, undefined, 'Lecture deleted successfully');
});

export const getLectureHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }
    
    // Authorization check placeholder for security logic
    const userRole = getUserRole(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;

    const result = await lectureService.getLectureByIdService(req.params.id!, cacheKey, isEnrolled);

    if (!result.success) {
        return sendError(res, result.message || 'Lecture not found', 404, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Lecture retrieved successfully', 200, { cached: !!cacheKey });
});

export const getLecturesByChapterHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const userRole = getUserRole(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;

    const result = await lectureService.getLecturesByChapterService(req.params.chapterId!, cacheKey, isEnrolled);
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve lectures', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Lectures retrieved successfully', 200, { cached: !!cacheKey });
});

export const reorderLecturesHandler = catchAsync(async (req: LectureAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req) as UserRole;

    const { chapterId, order } = req.body; 
    
    const result = await lectureService.reorderLecturesService(
        chapterId, 
        order,
        userId, 
        userRole
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Lecture reordering failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Lectures reordered successfully');
});