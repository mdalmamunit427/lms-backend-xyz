import { ClientSession } from 'mongoose';
import { IEnrollment } from './enrollment.model';
export type EnrollmentQueryOptions = {
    page?: number;
    limit?: number;
    studentId?: string;
    courseId?: string;
    instructorId?: string;
};
export declare const findEnrollmentById: (enrollmentId: string, session?: ClientSession) => Promise<IEnrollment | null>;
export declare const findEnrollmentByStudentAndCourse: (studentId: string, courseId: string, session?: ClientSession) => Promise<IEnrollment | null>;
export declare const findEnrollmentsByStudent: (studentId: string, session?: ClientSession) => Promise<IEnrollment[]>;
export declare const findEnrollmentsByCourse: (courseId: string, session?: ClientSession) => Promise<IEnrollment[]>;
export declare const findEnrollmentsByInstructor: (instructorId: string, session?: ClientSession) => Promise<IEnrollment[]>;
export declare const countEnrollmentsByStudent: (studentId: string, session?: ClientSession) => Promise<number>;
export declare const countEnrollmentsByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createEnrollment: (data: Partial<IEnrollment>, session?: ClientSession) => Promise<IEnrollment>;
export declare const updateEnrollmentById: (enrollmentId: string, updateData: Partial<IEnrollment>, session?: ClientSession) => Promise<IEnrollment | null>;
export declare const deleteEnrollmentById: (enrollmentId: string, session?: ClientSession) => Promise<IEnrollment | null>;
export declare const deleteEnrollmentByStudentAndCourse: (studentId: string, courseId: string, session?: ClientSession) => Promise<IEnrollment | null>;
export declare const bulkDeleteEnrollmentsByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteEnrollmentsByStudent: (studentId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateEnrollmentStats: () => Promise<any>;
export declare const aggregateEnrollmentsByPeriod: (period?: "day" | "week" | "month") => Promise<any>;
//# sourceMappingURL=enrollment.repository.d.ts.map