export interface ChapterItem {
    id: string;
    type: 'lecture' | 'quiz';
    order: number;
    createdAt: Date;
    document: any;
}
export interface ReorderRequest {
    itemId: string;
    itemType: 'lecture' | 'quiz';
    order: number;
}
export interface ReorderResult {
    itemId: string;
    itemType: 'lecture' | 'quiz';
    newOrder: number;
}
/**
 * Smart reorder logic for mixed lectures and quizzes within a chapter
 * Handles order conflicts by placing items in the next available position
 * OPTIMIZED: Reduces database calls and improves performance
 *
 * @param chapterId - The chapter ID containing the items
 * @param orderList - Array of items to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all items
 */
export declare const reorderChapterItemsWithConflictResolution: (chapterId: string, orderList: ReorderRequest[], session: any) => Promise<ReorderResult[]>;
/**
 * Updates the chapter's content array to reflect the current order of lectures and quizzes
 *
 * @param chapterId - The chapter ID to update
 * @param session - MongoDB session for transaction support
 *
 * NOTE: This function is deprecated since we removed the content array from chapters.
 * Content is now dynamically generated from lectures and quizzes collections.
 */
export declare const updateChapterContentArray: (chapterId: string, session: any) => Promise<void>;
/**
 * Calculates the next available order number for a new item in a chapter
 *
 * @param chapterId - The chapter ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<number> - The next available order number
 */
export declare const getNextAvailableOrder: (chapterId: string, session?: any) => Promise<number>;
/**
 * Smart reorder logic for chapters within a course
 * Handles order conflicts by placing chapters in the next available position
 * OPTIMIZED: Reduces database calls and improves performance
 *
 * @param courseId - The course ID containing the chapters
 * @param orderList - Array of chapters to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all chapters
 */
export declare const reorderCourseChaptersWithConflictResolution: (courseId: string, orderList: {
    chapterId: string;
    order: number;
}[], session: any) => Promise<ReorderResult[]>;
/**
 * ULTRA OPTIMIZED: Single bulk reorder operation for chapters and lectures
 * Reduces database calls from N+2 to just 3 calls total
 *
 * @param courseId - The course ID containing the chapters
 * @param orderList - Array of chapters with their lectures to reorder
 * @param session - MongoDB session for transaction support
 */
export declare const reorderChaptersAndLecturesBulkOptimized: (courseId: string, orderList: {
    chapterId: string;
    order: number;
    lectures?: {
        lectureId: string;
        order: number;
    }[];
}[], session: any) => Promise<void>;
/**
 * Validates that a chapter exists and belongs to the specified course
 *
 * @param chapterId - The chapter ID to validate
 * @param courseId - The expected course ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<Chapter> - The validated chapter document
 * @throws AppError if chapter not found or doesn't belong to course
 */
export declare const validateChapterBelongsToCourse: (chapterId: string, courseId: string, session?: any) => Promise<any>;
//# sourceMappingURL=chapterReorder.d.ts.map