// src/utils/security/ownership.ts

import mongoose from 'mongoose';
import Course, { ICourse } from '../modules/courses/course.model';
import { AppError, createError } from './errorHandler';

// Re-defining the required user role type for the utility
export type UserRole = 'admin' | 'instructor' | 'student'; 

/**
 * Validates the existence and ownership of a Course resource.
 * Enforces: Admin can manage any course; Instructor can only manage their own courses.
 * * @param courseId The ID of the course being modified.
 * @param userId The ID of the user attempting the action.
 * @param userRole The role of the user.
 * @param session The optional MongoDB session for transactional integrity.
 * @returns The verified Course document.
 */
export const validateCourseAndOwnership = async (
    courseId: string,
    userId: string,
    userRole: UserRole,
    session: mongoose.ClientSession
): Promise<ICourse> => {
    // 1. Find the course
    const course = await Course.findById(courseId).session(session);
    if (!course) {
        throw createError("Course not found", 404);
    }

    // 2. Check Permissions
    const isAdmin = userRole === 'admin';
    // ASSUMPTION: Course model has a single 'instructor' ObjectId field
    const isOwner = course.instructor.toString() === userId; 

    if (!isAdmin && !isOwner) {
        throw createError("You do not have permission to manage this course's content.", 403);
    }

    return course;
};