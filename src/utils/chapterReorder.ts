// src/utils/chapterReorder.ts

import { AppError } from "./errorHandler";
import mongoose from 'mongoose';
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
 * OPTIMIZED: Reduces database calls and improves performance
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
    // OPTIMIZATION: Early return if no items to reorder
    if (!orderList.length) {
        return [];
    }

    // OPTIMIZATION: Single query with aggregation to get all items at once
    // Added hint for better performance on indexed fields
    const allItems = await Lecture.aggregate([
        { $match: { chapter: new mongoose.Types.ObjectId(chapterId) } },
        { $project: { _id: 1, order: 1, createdAt: 1, type: { $literal: 'lecture' } } },
        { $unionWith: {
            coll: 'quizzes',
            pipeline: [
                { $match: { chapter: new mongoose.Types.ObjectId(chapterId) } },
                { $project: { _id: 1, order: 1, createdAt: 1, type: { $literal: 'quiz' } } }
            ]
        }},
        { $sort: { order: 1, createdAt: 1 } }
    ]).session(session).hint({ chapter: 1, order: 1 }); // Use compound index hint

    if (!allItems.length) {
        throw createError("No items found in this chapter", 404);
    }

    // OPTIMIZATION: Create lookup map for O(1) validation
    const itemMap = new Map(allItems.map(item => [
        item._id.toString(),
        { type: item.type, order: item.order, createdAt: item.createdAt }
    ]));

    // OPTIMIZATION: Batch validation - check all items at once
    const missingItems = orderList.filter(({ itemId }) => !itemMap.has(itemId));
    if (missingItems.length > 0) {
        const missingIds = missingItems.map(item => item.itemId).join(', ');
        throw createError(`Items not found in chapter ${chapterId}: ${missingIds}`, 404);
    }

    // OPTIMIZATION: Simplified reordering algorithm with better performance
    const finalOrdering = new Map<string, { type: string; newOrder: number }>();
    const placedItems = new Set<string>();
    
    // Sort reorder requests by target position
    const sortedReorders = [...orderList].sort((a, b) => a.order - b.order);
    
    // Place items with explicit positions
    for (const { itemId, order } of sortedReorders) {
        const itemData = itemMap.get(itemId)!;
        finalOrdering.set(itemId, { type: itemData.type, newOrder: order });
        placedItems.add(itemId);
    }
    
    // Place remaining items in their current order
    let nextOrder = 1;
    const usedOrders = new Set(Array.from(finalOrdering.values()).map(item => item.newOrder));
    
    for (const [itemId, itemData] of itemMap) {
        if (!placedItems.has(itemId)) {
            // Find next available order number more efficiently
            while (usedOrders.has(nextOrder)) {
                nextOrder++;
            }
            finalOrdering.set(itemId, { type: itemData.type, newOrder: nextOrder });
            usedOrders.add(nextOrder);
            nextOrder++;
        }
    }

    // OPTIMIZATION: Separate bulk operations by type for better performance
    const lectureOps: any[] = [];
    const quizOps: any[] = [];
    
    for (const [itemId, { type, newOrder }] of finalOrdering) {
        const operation = {
            updateOne: { 
                filter: { _id: itemId, chapter: chapterId }, 
                update: { $set: { order: newOrder } } 
            }
        };
        
        if (type === 'lecture') {
            lectureOps.push(operation);
        } else {
            quizOps.push(operation);
        }
    }
    
    // OPTIMIZATION: Execute bulk operations in parallel with better error handling
    const bulkPromises = [];
    if (lectureOps.length > 0) {
        bulkPromises.push(
            Lecture.bulkWrite(lectureOps, { 
                session, 
                ordered: false, // Allow parallel execution
                writeConcern: { w: 1 }
            })
        );
    }
    if (quizOps.length > 0) {
        bulkPromises.push(
            Quiz.bulkWrite(quizOps, { 
                session, 
                ordered: false, // Allow parallel execution
                writeConcern: { w: 1 }
            })
        );
    }
    
    // Wait for all bulk operations to complete
    if (bulkPromises.length > 0) {
        await Promise.all(bulkPromises);
    }

    // Return results in the same format
    return Array.from(finalOrdering.entries()).map(([itemId, { type, newOrder }]) => ({
        itemId,
        itemType: type as 'lecture' | 'quiz',
        newOrder
    }));
};

/**
 * Updates the chapter's content array to reflect the current order of lectures and quizzes
 * 
 * @param chapterId - The chapter ID to update
 * @param session - MongoDB session for transaction support
 * 
 * NOTE: This function is deprecated since we removed the content array from chapters.
 * Content is now dynamically generated from lectures and quizzes collections.
 */
export const updateChapterContentArray = async (chapterId: string, session: any): Promise<void> => {
    // No-op: Content is now dynamically generated from lectures/quizzes collections
    // This function is kept for backward compatibility but does nothing
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
 * OPTIMIZED: Reduces database calls and improves performance
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
    // OPTIMIZATION: Early return if no items to reorder
    if (!orderList.length) {
        return [];
    }

    // OPTIMIZATION: Single query to get all chapters with minimal fields and index hint
    const allChapters = await Chapter.find(
        { course: courseId }, 
        { _id: 1, order: 1, createdAt: 1 } // Only fetch required fields
    ).sort({ order: 1, createdAt: 1 }).session(session).hint({ course: 1, order: 1 }); // Use compound index hint

    if (!allChapters.length) {
        throw createError("No chapters found in this course", 404);
    }

    // OPTIMIZATION: Create lookup map for O(1) validation
    const chapterMap = new Map(allChapters.map(chapter => [
        (chapter._id as any).toString(), 
        { order: chapter.order, createdAt: (chapter as any).createdAt }
    ]));

    // OPTIMIZATION: Batch validation - check all chapters at once
    const missingChapters = orderList.filter(({ chapterId }) => !chapterMap.has(chapterId));
    if (missingChapters.length > 0) {
        const missingIds = missingChapters.map(item => item.chapterId).join(', ');
        throw createError(`Chapters not found in course ${courseId}: ${missingIds}`, 404);
    }

    // OPTIMIZATION: Simplified reordering algorithm with better performance
    const allItems = Array.from(chapterMap.entries()).map(([id, data]) => ({
        id,
        order: data.order,
        createdAt: data.createdAt
    }));

    // Create final ordering map
    const finalOrdering = new Map<string, number>();
    const placedItems = new Set<string>();
    
    // Sort reorder requests by target position
    const sortedReorders = [...orderList].sort((a, b) => a.order - b.order);
    
    // Place items with explicit positions
    for (const { chapterId, order } of sortedReorders) {
        finalOrdering.set(chapterId, order);
        placedItems.add(chapterId);
    }
    
    // Place remaining items in their current order
    let nextOrder = 1;
    const usedOrders = new Set(Array.from(finalOrdering.values()));
    
    for (const item of allItems) {
        if (!placedItems.has(item.id)) {
            // Find next available order number more efficiently
            while (usedOrders.has(nextOrder)) {
                nextOrder++;
            }
            finalOrdering.set(item.id, nextOrder);
            usedOrders.add(nextOrder);
            nextOrder++;
        }
    }

    // OPTIMIZATION: Single bulk operation with optimized updates
    const bulkOps = Array.from(finalOrdering.entries()).map(([chapterId, newOrder]) => ({
        updateOne: { 
            filter: { _id: chapterId, course: courseId }, 
            update: { $set: { order: newOrder } } 
        },
    }));

    // Execute single bulk operation
    if (bulkOps.length > 0) {
        await Chapter.bulkWrite(bulkOps, { 
            session, 
            ordered: false, // Allow parallel execution for better performance
            writeConcern: { w: 1 } // Reduce write concern for better performance
        });
    }

    // Return results in the same format
    return Array.from(finalOrdering.entries()).map(([itemId, newOrder]) => ({
        itemId,
        itemType: 'chapter' as any,
        newOrder
    }));
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
