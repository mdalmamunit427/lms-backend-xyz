import { ClientSession } from 'mongoose';
import { IChapter } from './chapter.model';
export type ChapterQueryOptions = {
    page?: number;
    limit?: number;
    courseId?: string;
};
export declare const findChapterById: (chapterId: string, session?: ClientSession) => Promise<IChapter | null>;
export declare const findChaptersByCourse: (courseId: string, session?: ClientSession) => Promise<IChapter[]>;
export declare const countChaptersByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createChapter: (data: Partial<IChapter>, session?: ClientSession) => Promise<IChapter>;
export declare const updateChapterById: (chapterId: string, updateData: Partial<IChapter>, session?: ClientSession) => Promise<IChapter | null>;
export declare const deleteChapterById: (chapterId: string, session?: ClientSession) => Promise<IChapter | null>;
export declare const bulkUpdateChapters: (operations: Array<{
    chapterId: string;
    order: number;
}>, session?: ClientSession) => Promise<void>;
export declare const deleteChapterDependencies: (chapterId: string, session: ClientSession) => Promise<void>;
//# sourceMappingURL=chapter.repository.d.ts.map