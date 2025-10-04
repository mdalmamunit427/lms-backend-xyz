import { ILecture } from "../lectures/lecture.model";
import { IChapter } from "./chapter.model";
import { ServiceResponse } from "../../@types/api";
export type ICreateChapterData = {
    title: string;
    course: string;
    order?: number;
};
export type IUpdateChapterData = {
    title?: string;
    order?: number;
};
export type IReorderItem = {
    chapterId: string;
    order: number;
    lectures?: {
        lectureId: string;
        order: number;
    }[];
};
export type ILectureData = Omit<ILecture, "chapter" | "course" | "order">;
export type UserRole = 'admin' | 'instructor' | 'student';
export declare const updateChapterDuration: (chapterId: string, session?: any) => Promise<void>;
export declare const createChapter: (data: ICreateChapterData, userId: string, userRole: UserRole) => Promise<ServiceResponse<IChapter>>;
/**
 * Create Chapter with multiple Lectures (Transactional)
 */
export declare const createChapterWithLectures: (chapterData: ICreateChapterData, lecturesData: ILectureData[], userId: string, userRole: UserRole) => Promise<ServiceResponse<{
    chapter: IChapter;
    lectures: ILecture[];
}>>;
/**
 * Update Chapter (title / order) - OPTIMIZED VERSION
 * Reduces database calls by optimizing validation and reordering
 */
export declare const updateChapter: (id: string, data: IUpdateChapterData, userId: string, userRole: UserRole) => Promise<ServiceResponse<IChapter>>;
export declare const deleteChapterService: (chapterId: string, userId: string, userRole: UserRole) => Promise<ServiceResponse<IChapter>>;
/**
 * Reorder Chapters with Lectures - ULTRA OPTIMIZED VERSION
 * Reduces database calls from N+2 to just 3 calls total
 */
export declare const reorderChaptersWithLectures: (courseId: string, orderList: IReorderItem[], userId: string, userRole: UserRole) => Promise<ServiceResponse<boolean>>;
/**
 * Get Chapters for a Course (IMPLEMENTING CACHING)
 */
export declare const getChaptersByCourse: (courseId: string, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get Single Chapter (IMPLEMENTING CACHING)
 */
export declare const getChapterById: (id: string, cacheKey: string) => Promise<ServiceResponse<any>>;
//# sourceMappingURL=chapter.service.d.ts.map