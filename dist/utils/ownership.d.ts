import { ICourse } from '../modules/courses/course.model';
export type UserRole = 'admin' | 'instructor' | 'student';
export declare const validateCourseAndOwnership: (courseId: string, userId: string, userRole: UserRole) => Promise<ICourse>;
//# sourceMappingURL=ownership.d.ts.map