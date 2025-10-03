import { ClientSession } from 'mongoose';
import { ILecture } from './lecture.model';
export type LectureQueryOptions = {
    page?: number;
    limit?: number;
    chapterId?: string;
    courseId?: string;
};
export declare const findLectureById: (lectureId: string, session?: ClientSession) => Promise<ILecture | null>;
export declare const findLecturesByChapter: (chapterId: string, session?: ClientSession) => Promise<ILecture[]>;
export declare const findLecturesByCourse: (courseId: string, session?: ClientSession) => Promise<ILecture[]>;
export declare const countLecturesByChapter: (chapterId: string, session?: ClientSession) => Promise<number>;
export declare const countLecturesByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createLecture: (data: Partial<ILecture>, session?: ClientSession) => Promise<ILecture>;
export declare const updateLectureById: (lectureId: string, updateData: Partial<ILecture>, session?: ClientSession) => Promise<ILecture | null>;
export declare const deleteLectureById: (lectureId: string, session?: ClientSession) => Promise<ILecture | null>;
export declare const bulkUpdateLectures: (operations: Array<{
    lectureId: string;
    order: number;
}>, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteLecturesByChapter: (chapterId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteLecturesByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateLectureStats: (courseId: string) => Promise<any>;
//# sourceMappingURL=lecture.repository.d.ts.map