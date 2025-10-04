"use strict";
// src/utils/chapterReorder.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChapterBelongsToCourse = exports.reorderCourseChaptersWithConflictResolution = exports.getNextAvailableOrder = exports.updateChapterContentArray = exports.reorderChapterItemsWithConflictResolution = void 0;
const errorHandler_1 = require("./errorHandler");
const lecture_model_1 = __importDefault(require("../modules/lectures/lecture.model"));
const quiz_model_1 = __importDefault(require("../modules/quizes/quiz.model"));
const chapter_model_1 = __importDefault(require("../modules/chapters/chapter.model"));
/**
 * Smart reorder logic for mixed lectures and quizzes within a chapter
 * Handles order conflicts by placing items in the next available position
 *
 * @param chapterId - The chapter ID containing the items
 * @param orderList - Array of items to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all items
 */
const reorderChapterItemsWithConflictResolution = async (chapterId, orderList, session) => {
    // Get all lectures and quizzes in this chapter
    const [allLectures, allQuizzes] = await Promise.all([
        lecture_model_1.default.find({ chapter: chapterId }).sort({ order: 1, createdAt: 1 }).session(session),
        quiz_model_1.default.find({ chapter: chapterId }).sort({ order: 1, createdAt: 1 }).session(session)
    ]);
    // Combine all items with their types
    const allItems = [
        ...allLectures.map(lecture => ({
            id: lecture._id.toString(),
            type: 'lecture',
            order: lecture.order,
            createdAt: lecture.createdAt,
            document: lecture
        })),
        ...allQuizzes.map(quiz => ({
            id: quiz._id.toString(),
            type: 'quiz',
            order: quiz.order,
            createdAt: quiz.createdAt,
            document: quiz
        }))
    ];
    if (!allItems.length) {
        throw (0, errorHandler_1.createError)("No items found in this chapter", 404);
    }
    // Validate that all provided item IDs exist in this chapter
    const itemIds = allItems.map(item => item.id);
    for (const { itemId } of orderList) {
        if (!itemIds.includes(itemId)) {
            throw (0, errorHandler_1.createError)(`Item ${itemId} not found in chapter ${chapterId}`, 404);
        }
    }
    // Step 1: Create an array to hold the final positions
    const finalPositions = new Array(allItems.length).fill(null);
    // Step 2: Place items that have explicit new positions
    const placedItems = new Set();
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
        if (a.order !== b.order)
            return a.order - b.order;
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
    const finalOrdering = finalPositions
        .filter(itemId => itemId !== null)
        .map((itemId, index) => {
        const item = allItems.find(i => i.id === itemId);
        return {
            itemId: itemId,
            itemType: item.type,
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
        await lecture_model_1.default.bulkWrite(lectureBulkOps, { session, ordered: true });
    }
    if (quizBulkOps.length) {
        await quiz_model_1.default.bulkWrite(quizBulkOps, { session, ordered: true });
    }
    // Step 6: Update chapter content array to reflect new order
    await (0, exports.updateChapterContentArray)(chapterId, session);
    return finalOrdering;
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
 *
 * @param courseId - The course ID containing the chapters
 * @param orderList - Array of chapters to reorder with their target positions
 * @param session - MongoDB session for transaction support
 * @returns Promise<ReorderResult[]> - The final ordering of all chapters
 */
const reorderCourseChaptersWithConflictResolution = async (courseId, orderList, session) => {
    // Get all chapters in this course
    const allChapters = await chapter_model_1.default.find({ course: courseId }).sort({ order: 1, createdAt: 1 }).session(session);
    if (!allChapters.length) {
        throw (0, errorHandler_1.createError)("No chapters found in this course", 404);
    }
    // Combine all chapters with their types (treating chapters as 'chapter' type)
    const allItems = allChapters.map(chapter => ({
        id: chapter._id.toString(),
        type: 'chapter', // We'll extend the type system
        order: chapter.order,
        createdAt: chapter.createdAt,
        document: chapter
    }));
    // Validate that all provided chapter IDs exist in this course
    const itemIds = allItems.map(item => item.id);
    for (const { chapterId } of orderList) {
        if (!itemIds.includes(chapterId)) {
            throw (0, errorHandler_1.createError)(`Chapter ${chapterId} not found in course ${courseId}`, 404);
        }
    }
    // Step 1: Create an array to hold the final positions
    const finalPositions = new Array(allItems.length).fill(null);
    // Step 2: Place chapters that have explicit new positions
    const placedItems = new Set();
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
        if (a.order !== b.order)
            return a.order - b.order;
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
    const finalOrdering = finalPositions
        .filter(itemId => itemId !== null)
        .map((itemId, index) => {
        const item = allItems.find(i => i.id === itemId);
        return {
            itemId: itemId,
            itemType: 'chapter', // We'll handle this in the bulk operation
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
        await chapter_model_1.default.bulkWrite(chapterBulkOps, { session, ordered: true });
    }
    return finalOrdering;
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