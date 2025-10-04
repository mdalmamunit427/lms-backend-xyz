"use strict";
// src/utils/chapterReorder.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChapterBelongsToCourse = exports.reorderCourseChaptersWithConflictResolution = exports.getNextAvailableOrder = exports.updateChapterContentArray = exports.reorderChapterItemsWithConflictResolution = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("./errorHandler");
const lecture_model_1 = __importDefault(require("../modules/lectures/lecture.model"));
const quiz_model_1 = __importDefault(require("../modules/quizes/quiz.model"));
const chapter_model_1 = __importDefault(require("../modules/chapters/chapter.model"));
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
const reorderChapterItemsWithConflictResolution = async (chapterId, orderList, session) => {
    // OPTIMIZATION: Early return if no items to reorder
    if (!orderList.length) {
        return [];
    }
    // OPTIMIZATION: Single query with aggregation to get all items at once
    // Added hint for better performance on indexed fields
    const allItems = await lecture_model_1.default.aggregate([
        { $match: { chapter: new mongoose_1.default.Types.ObjectId(chapterId) } },
        { $project: { _id: 1, order: 1, createdAt: 1, type: { $literal: 'lecture' } } },
        { $unionWith: {
                coll: 'quizzes',
                pipeline: [
                    { $match: { chapter: new mongoose_1.default.Types.ObjectId(chapterId) } },
                    { $project: { _id: 1, order: 1, createdAt: 1, type: { $literal: 'quiz' } } }
                ]
            } },
        { $sort: { order: 1, createdAt: 1 } }
    ]).session(session).hint({ chapter: 1, order: 1 }); // Use compound index hint
    if (!allItems.length) {
        throw (0, errorHandler_1.createError)("No items found in this chapter", 404);
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
        throw (0, errorHandler_1.createError)(`Items not found in chapter ${chapterId}: ${missingIds}`, 404);
    }
    // OPTIMIZATION: Simplified reordering algorithm with better performance
    const finalOrdering = new Map();
    const placedItems = new Set();
    // Sort reorder requests by target position
    const sortedReorders = [...orderList].sort((a, b) => a.order - b.order);
    // Place items with explicit positions
    for (const { itemId, order } of sortedReorders) {
        const itemData = itemMap.get(itemId);
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
    const lectureOps = [];
    const quizOps = [];
    for (const [itemId, { type, newOrder }] of finalOrdering) {
        const operation = {
            updateOne: {
                filter: { _id: itemId, chapter: chapterId },
                update: { $set: { order: newOrder } }
            }
        };
        if (type === 'lecture') {
            lectureOps.push(operation);
        }
        else {
            quizOps.push(operation);
        }
    }
    // OPTIMIZATION: Execute bulk operations in parallel with better error handling
    const bulkPromises = [];
    if (lectureOps.length > 0) {
        bulkPromises.push(lecture_model_1.default.bulkWrite(lectureOps, {
            session,
            ordered: false, // Allow parallel execution
            writeConcern: { w: 1 }
        }));
    }
    if (quizOps.length > 0) {
        bulkPromises.push(quiz_model_1.default.bulkWrite(quizOps, {
            session,
            ordered: false, // Allow parallel execution
            writeConcern: { w: 1 }
        }));
    }
    // Wait for all bulk operations to complete
    if (bulkPromises.length > 0) {
        await Promise.all(bulkPromises);
    }
    // Return results in the same format
    return Array.from(finalOrdering.entries()).map(([itemId, { type, newOrder }]) => ({
        itemId,
        itemType: type,
        newOrder
    }));
};
exports.reorderChapterItemsWithConflictResolution = reorderChapterItemsWithConflictResolution;
/**
 * Updates the chapter's content array to reflect the current order of lectures and quizzes
 *
 * @param chapterId - The chapter ID to update
 * @param session - MongoDB session for transaction support
 *
 * NOTE: This function is deprecated since we removed the content array from chapters.
 * Content is now dynamically generated from lectures and quizzes collections.
 */
const updateChapterContentArray = async (chapterId, session) => {
    // No-op: Content is now dynamically generated from lectures/quizzes collections
    // This function is kept for backward compatibility but does nothing
};
exports.updateChapterContentArray = updateChapterContentArray;
/**
 * Calculates the next available order number for a new item in a chapter
 *
 * @param chapterId - The chapter ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<number> - The next available order number
 */
const getNextAvailableOrder = async (chapterId, session) => {
    const [lectureCount, quizCount] = await Promise.all([
        lecture_model_1.default.countDocuments({ chapter: chapterId }).session(session || null),
        quiz_model_1.default.countDocuments({ chapter: chapterId }).session(session || null)
    ]);
    return lectureCount + quizCount + 1;
};
exports.getNextAvailableOrder = getNextAvailableOrder;
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
const reorderCourseChaptersWithConflictResolution = async (courseId, orderList, session) => {
    // OPTIMIZATION: Early return if no items to reorder
    if (!orderList.length) {
        return [];
    }
    // OPTIMIZATION: Single query to get all chapters with minimal fields and index hint
    const allChapters = await chapter_model_1.default.find({ course: courseId }, { _id: 1, order: 1, createdAt: 1 } // Only fetch required fields
    ).sort({ order: 1, createdAt: 1 }).session(session).hint({ course: 1, order: 1 }); // Use compound index hint
    if (!allChapters.length) {
        throw (0, errorHandler_1.createError)("No chapters found in this course", 404);
    }
    // OPTIMIZATION: Create lookup map for O(1) validation
    const chapterMap = new Map(allChapters.map(chapter => [
        chapter._id.toString(),
        { order: chapter.order, createdAt: chapter.createdAt }
    ]));
    // OPTIMIZATION: Batch validation - check all chapters at once
    const missingChapters = orderList.filter(({ chapterId }) => !chapterMap.has(chapterId));
    if (missingChapters.length > 0) {
        const missingIds = missingChapters.map(item => item.chapterId).join(', ');
        throw (0, errorHandler_1.createError)(`Chapters not found in course ${courseId}: ${missingIds}`, 404);
    }
    // OPTIMIZATION: Simplified reordering algorithm with better performance
    const allItems = Array.from(chapterMap.entries()).map(([id, data]) => ({
        id,
        order: data.order,
        createdAt: data.createdAt
    }));
    // Create final ordering map
    const finalOrdering = new Map();
    const placedItems = new Set();
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
        await chapter_model_1.default.bulkWrite(bulkOps, {
            session,
            ordered: false, // Allow parallel execution for better performance
            writeConcern: { w: 1 } // Reduce write concern for better performance
        });
    }
    // Return results in the same format
    return Array.from(finalOrdering.entries()).map(([itemId, newOrder]) => ({
        itemId,
        itemType: 'chapter',
        newOrder
    }));
};
exports.reorderCourseChaptersWithConflictResolution = reorderCourseChaptersWithConflictResolution;
/**
 * Validates that a chapter exists and belongs to the specified course
 *
 * @param chapterId - The chapter ID to validate
 * @param courseId - The expected course ID
 * @param session - MongoDB session for transaction support
 * @returns Promise<Chapter> - The validated chapter document
 * @throws AppError if chapter not found or doesn't belong to course
 */
const validateChapterBelongsToCourse = async (chapterId, courseId, session) => {
    const chapter = await chapter_model_1.default.findById(chapterId).session(session || null);
    if (!chapter || chapter.course.toString() !== courseId) {
        throw (0, errorHandler_1.createError)("Chapter not found or does not belong to the specified course.", 404);
    }
    return chapter;
};
exports.validateChapterBelongsToCourse = validateChapterBelongsToCourse;
//# sourceMappingURL=chapterReorder.js.map