import mongoose, { ClientSession } from 'mongoose';
import { ICourseProgress } from './progress.model';
export type ProgressQueryOptions = {
    page?: number;
    limit?: number;
    userId?: string;
    courseId?: string;
};
export declare const findProgressById: (progressId: string, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const findProgressByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const findProgressByUser: (userId: string, session?: ClientSession) => Promise<ICourseProgress[]>;
export declare function findCourseProgress(userId: string, courseId: string): Promise<(mongoose.FlattenMaps<ICourseProgress> & Required<{
    _id: mongoose.FlattenMaps<unknown>;
}> & {
    __v: number;
}) | {
    course: (mongoose.FlattenMaps<import("../courses/course.model").ICourse> & Required<{
        _id: mongoose.FlattenMaps<unknown>;
    }> & {
        __v: number;
    }) | null;
    completedLectures: {};
    totalLecturesCompleted: number;
    quizzesCompleted: boolean;
    averageQuizScore: number;
    isCourseCompleted: boolean;
    lastViewedLecture: null;
    completionPercentage: number;
    totalLectures: number;
    remainingLectures: number;
}>;
export declare const countCompletedCoursesByUser: (userId: string, session?: ClientSession) => Promise<number>;
export declare const countProgressByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const countCompletedByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createProgress: (data: Partial<ICourseProgress>, session?: ClientSession) => Promise<ICourseProgress>;
export declare const updateProgressById: (progressId: string, updateData: Partial<ICourseProgress>, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const updateProgressByUserAndCourse: (userId: string, courseId: string, updateData: Partial<ICourseProgress>, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const deleteProgressById: (progressId: string, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const deleteProgressByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<ICourseProgress | null>;
export declare const bulkDeleteProgressByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteProgressByUser: (userId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateUserStats: (userId: string) => Promise<any>;
export declare const aggregateCourseStats: (courseId: string) => Promise<any>;
//# sourceMappingURL=progress.repository.d.ts.map