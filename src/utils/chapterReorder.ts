// src/utils/chapterReorder.ts

import { AppError } from "./errorHandler";
import { createError } from "./errorHandler";
import Lecture from "../modules/lectures/lecture.model";
import Quiz from "../modules/quizes/quiz.model";
import Chapter from "../modules/chapters/chapter.model";

// Types for the reorder utility
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
 * 
 * @param chapterId - The chapter ID containing the items
 * @param orderList - Array of items to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all items
 */
export const reorderChapterItemsWithConflictResolution = async (
    chapterId: string, 
    orderList: ReorderRequest[], 
    session: any
): Promise<ReorderResult[]> => {
    // Get all lectures and quizzes in this chapter
    const [allLectures, allQuizzes] = await Promise.all([
        Lecture.find({ chapter: chapterId }).sort({ order: 1, createdAt: 1 }).session(session),
        Quiz.find({ chapter: chapterId }).sort({ order: 1, createdAt: 1 }).session(session)
    ]);

    // Combine all items with their types
    const allItems: ChapterItem[] = [
        ...allLectures.map(lecture => ({
            id: (lecture._id as any).toString(),
            type: 'lecture' as const,
            order: lecture.order,
            createdAt: (lecture as any).createdAt,
            document: lecture
        })),
        ...allQuizzes.map(quiz => ({
            id: (quiz._id as any).toString(),
            type: 'quiz' as const,
            order: quiz.order,
            createdAt: (quiz as any).createdAt,
            document: quiz
        }))
    ];

    if (!allItems.length) {
        throw createError("No items found in this chapter", 404);
    }

    // Validate that all provided item IDs exist in this chapter
    const itemIds = allItems.map(item => item.id);
    for (const { itemId } of orderList) {
        if (!itemIds.includes(itemId)) {
            throw createError(`Item ${itemId} not found in chapter ${chapterId}`, 404);
        }
    }

    // Step 1: Create an array to hold the final positions
    const finalPositions: (string | null)[] = new Array(allItems.length).fill(null);
    
    // Step 2: Place items that have explicit new positions
    const placedItems = new Set<string>();
    
    // Sort reorder requests by target position to handle them in order
    const sortedReorders = [...orderList].sort((a, b) => a.order - b.order);
    
    for (const { itemId, order } of sortedReorders) {
        const targetIndex = order - 1; // Convert to 0-based index
        
        // Find the first available position at or after the target position
        let actualIndex = targetIndex;
        while (actualIndex < finalPositions.length && finalPositions[actualIndex] !== null) {
            actualIndex++;
        }
        
        // If we've gone beyond the array, extend it
        if (actualIndex >= finalPositions.length) {
            finalPositions.push(null);
        }
        
        finalPositions[actualIndex] = itemId;
        placedItems.add(itemId);
    }
    
    // Step 3: Place remaining items in available positions, maintaining their relative order
    const unplacedItems = allItems
        .filter(item => !placedItems.has(item.id))
        .sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        });
    
    let unplacedIndex = 0;
    for (let i = 0; i < finalPositions.length && unplacedIndex < unplacedItems.length; i++) {
        if (finalPositions[i] === null) {
            const item = unplacedItems[unplacedIndex];
            if (item) {
                finalPositions[i] = item.id;
                unplacedIndex++;
            }
        }
    }
    
    // Add any remaining unplaced items to the end
    while (unplacedIndex < unplacedItems.length) {
        const item = unplacedItems[unplacedIndex];
        if (item) {
            finalPositions.push(item.id);
            unplacedIndex++;
        }
    }
    
    // Step 4: Create the final ordering
    const finalOrdering: ReorderResult[] = finalPositions
        .filter(itemId => itemId !== null)
        .map((itemId, index) => {
            const item = allItems.find(i => i.id === itemId);
            return {
                itemId: itemId!,
                itemType: item!.type,
                newOrder: index + 1
            };
        });

    // Step 5: Apply the new ordering with separate bulk operations for lectures and quizzes
    const lectureBulkOps = finalOrdering
        .filter(item => item.itemType === 'lecture')
        .map(item => ({
            updateOne: { 
                filter: { _id: item.itemId, chapter: chapterId }, 
                update: { $set: { order: item.newOrder } } 
            },
        }));
    
    const quizBulkOps = finalOrdering
        .filter(item => item.itemType === 'quiz')
        .map(item => ({
            updateOne: { 
                filter: { _id: item.itemId, chapter: chapterId }, 
                update: { $set: { order: item.newOrder } } 
            },
        }));
    
    // Execute bulk operations
    if (lectureBulkOps.length) {
        await Lecture.bulkWrite(lectureBulkOps, { session, ordered: true });
    }
    if (quizBulkOps.length) {
        await Quiz.bulkWrite(quizBulkOps, { session, ordered: true });
    }

    // Step 6: Update chapter content array to reflect new order
    await updateChapterContentArray(chapterId, session);

    return finalOrdering;
};

/**
 * Updates the chapter's content array to reflect the current order of lectures and quizzes
 * 
 * @param chapterId - The chapter ID to update
 * @param session - MongoDB session for transaction support
 */
export const updateChapterContentArray = async (chapterId: string, session: any): Promise<void> => {
    const chapter = await Chapter.findById(chapterId).session(session);
    if (!chapter) return;

    const [updatedLectures, updatedQuizzes] = await Promise.all([
        Lecture.find({ chapter: chapterId }).sort({ order: 1 }).session(session),
        Quiz.find({ chapter: chapterId }).sort({ order: 1 }).session(session)
    ]);
    
    // Combine and sort by order
    const allUpdatedItems = [
        ...updatedLectures.map(lecture => ({
            type: 'lecture' as const,
            refId: lecture._id as any,
            title: lecture.title,
            isPreview: lecture.isPreview || false,
            order: lecture.order
        })),
        ...updatedQuizzes.map(quiz => ({
            type: 'quiz' as const,
            refId: quiz._id as any,
            title: quiz.title,
            order: quiz.order
        }))
    ].sort((a, b) => a.order - b.order);
    
    // Remove the order field from content items (it's not stored in the schema)
    chapter.content = allUpdatedItems.map(({ order, ...item }) => item);
    await chapter.save({ session });
};

/**
 * Calculates the next available order number for a new item in a chapter
 * 
 * @param chapterId - The chapter ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<number> - The next available order number
 */
export const getNextAvailableOrder = async (chapterId: string, session?: any): Promise<number> => {
    const [lectureCount, quizCount] = await Promise.all([
        Lecture.countDocuments({ chapter: chapterId }).session(session || null),
        Quiz.countDocuments({ chapter: chapterId }).session(session || null)
    ]);
    
    return lectureCount + quizCount + 1;
};

/**
 * Smart reorder logic for chapters within a course
 * Handles order conflicts by placing chapters in the next available position
 * 
 * @param courseId - The course ID containing the chapters
 * @param orderList - Array of chapters to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all chapters
 */
export const reorderCourseChaptersWithConflictResolution = async (
    courseId: string, 
    orderList: { chapterId: string; order: number }[], 
    session: any
): Promise<ReorderResult[]> => {
    // Get all chapters in this course
    const allChapters = await Chapter.find({ course: courseId }).sort({ order: 1, createdAt: 1 }).session(session);

    if (!allChapters.length) {
        throw createError("No chapters found in this course", 404);
    }

    // Combine all chapters with their types (treating chapters as 'chapter' type)
    const allItems: ChapterItem[] = allChapters.map(chapter => ({
        id: (chapter._id as any).toString(),
        type: 'chapter' as any, // We'll extend the type system
        order: chapter.order,
        createdAt: (chapter as any).createdAt,
        document: chapter
    }));

    // Validate that all provided chapter IDs exist in this course
    const itemIds = allItems.map(item => item.id);
    for (const { chapterId } of orderList) {
        if (!itemIds.includes(chapterId)) {
            throw createError(`Chapter ${chapterId} not found in course ${courseId}`, 404);
        }
    }

    // Step 1: Create an array to hold the final positions
    const finalPositions: (string | null)[] = new Array(allItems.length).fill(null);
    
    // Step 2: Place chapters that have explicit new positions
    const placedItems = new Set<string>();
    
    // Sort reorder requests by target position to handle them in order
    const sortedReorders = [...orderList].sort((a, b) => a.order - b.order);
    
    for (const { chapterId, order } of sortedReorders) {
        const targetIndex = order - 1; // Convert to 0-based index
        
        // Find the first available position at or after the target position
        let actualIndex = targetIndex;
        while (actualIndex < finalPositions.length && finalPositions[actualIndex] !== null) {
            actualIndex++;
        }
        
        // If we've gone beyond the array, extend it
        if (actualIndex >= finalPositions.length) {
            finalPositions.push(null);
        }
        
        finalPositions[actualIndex] = chapterId;
        placedItems.add(chapterId);
    }
    
    // Step 3: Place remaining chapters in available positions, maintaining their relative order
    const unplacedItems = allItems
        .filter(item => !placedItems.has(item.id))
        .sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        });
    
    let unplacedIndex = 0;
    for (let i = 0; i < finalPositions.length && unplacedIndex < unplacedItems.length; i++) {
        if (finalPositions[i] === null) {
            const item = unplacedItems[unplacedIndex];
            if (item) {
                finalPositions[i] = item.id;
                unplacedIndex++;
            }
        }
    }
    
    // Add any remaining unplaced items to the end
    while (unplacedIndex < unplacedItems.length) {
        const item = unplacedItems[unplacedIndex];
        if (item) {
            finalPositions.push(item.id);
            unplacedIndex++;
        }
    }
    
    // Step 4: Create the final ordering
    const finalOrdering: ReorderResult[] = finalPositions
        .filter(itemId => itemId !== null)
        .map((itemId, index) => {
            const item = allItems.find(i => i.id === itemId);
            return {
                itemId: itemId!,
                itemType: 'chapter' as any, // We'll handle this in the bulk operation
                newOrder: index + 1
            };
        });

    // Step 5: Apply the new ordering with bulk operation for chapters
    const chapterBulkOps = finalOrdering.map(item => ({
        updateOne: { 
            filter: { _id: item.itemId, course: courseId }, 
            update: { $set: { order: item.newOrder } } 
        },
    }));

    // Execute bulk operations
    if (chapterBulkOps.length) {
        await Chapter.bulkWrite(chapterBulkOps, { session, ordered: true });
    }

    return finalOrdering;
};

/**
 * Validates that a chapter exists and belongs to the specified course
 * 
 * @param chapterId - The chapter ID to validate
 * @param courseId - The expected course ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<Chapter> - The validated chapter document
 * @throws AppError if chapter not found or doesn't belong to course
 */
export const validateChapterBelongsToCourse = async (
    chapterId: string, 
    courseId: string, 
    session?: any
): Promise<any> => {
    const chapter = await Chapter.findById(chapterId).session(session || null);
    if (!chapter || chapter.course.toString() !== courseId) {
        throw createError("Chapter not found or does not belong to the specified course.", 404);
    }
    return chapter;
};
