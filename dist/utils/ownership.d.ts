import mongoose from 'mongoose';
import { ICourse } from '../modules/courses/course.model';
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
export declare const validateCourseAndOwnership: (courseId: string, userId: string, userRole: UserRole, session: mongoose.ClientSession) => Promise<ICourse>;
//# sourceMappingURL=ownership.d.ts.map