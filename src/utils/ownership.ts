import Course, { ICourse } from '../modules/courses/course.model';
import { createError } from './errorHandler';

export type UserRole = 'admin' | 'instructor' | 'student';

export const validateCourseAndOwnership = async (
    courseId: string,
    userId: string,
    userRole: UserRole
): Promise<ICourse> => {
    const course = await Course.findById(courseId);
    if (!course) {
        throw createError("Course not found", 404);
    }

    const isAdmin = userRole === 'admin';
    const isOwner = course.instructor.toString() === userId;

    if (!isAdmin && !isOwner) {
        throw createError("You do not have permission to manage this course's content.", 403);
    }

    return course;
};