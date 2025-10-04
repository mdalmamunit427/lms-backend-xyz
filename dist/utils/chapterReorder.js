"use strict";
// src/utils/chapterReorder.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChapterBelongsToCourse = exports.reorderChaptersAndLecturesBulkOptimized = exports.reorderCourseChaptersWithConflictResolution = exports.getNextAvailableOrder = exports.updateChapterContentArray = exports.reorderChapterItemsWithConflictResolution = void 0;
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
    // OPTIMIZATION: Get all items with separate queries (required for transaction compatibility)
    // $unionWith is not supported inside MongoDB transactions
    const [lectures, quizzes] = await Promise.all([
        lecture_model_1.default.find({ chapter: chapterId }, { _id: 1, order: 1, createdAt: 1 }).sort({ order: 1, createdAt: 1 }).session(session).hint({ chapter: 1, order: 1 }),
        quiz_model_1.default.find({ chapter: chapterId }, { _id: 1, order: 1, createdAt: 1 }).sort({ order: 1, createdAt: 1 }).session(session).hint({ chapter: 1, order: 1 })
    ]);
    // Combine and format the results
    const allItems = [
        ...lectures.map(lecture => ({
            _id: lecture._id,
            order: lecture.order,
            createdAt: lecture.createdAt,
            type: 'lecture'
        })),
        ...quizzes.map(quiz => ({
            _id: quiz._id,
            order: quiz.order,
            createdAt: quiz.createdAt,
            type: 'quiz'
        }))
    ].sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
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
 * ULTRA OPTIMIZED: Single bulk reorder operation for chapters and lectures
 * Reduces database calls from N+2 to just 3 calls total
 *
 * @param courseId - The course ID containing the chapters
 * @param orderList - Array of chapters with their lectures to reorder
 * @param session - MongoDB session for transaction support
 */
const reorderChaptersAndLecturesBulkOptimized = async (courseId, orderList, session) => {
    if (!orderList.length)
        return;
    // STEP 1: Single query to get ALL chapters in the course
    const allChapters = await chapter_model_1.default.find({ course: courseId }, { _id: 1, order: 1, createdAt: 1 }).sort({ order: 1, createdAt: 1 }).session(session);
    if (!allChapters.length) {
        throw (0, errorHandler_1.createError)("No chapters found in this course", 404);
    }
    // STEP 2: Single query to get ALL lectures and quizzes for ALL chapters at once
    const chapterIds = orderList.map(item => item.chapterId);
    const [allLectures, allQuizzes] = await Promise.all([
        lecture_model_1.default.find({ chapter: { $in: chapterIds } }, { _id: 1, chapter: 1, order: 1, createdAt: 1 }).sort({ chapter: 1, order: 1, createdAt: 1 }).session(session),
        quiz_model_1.default.find({ chapter: { $in: chapterIds } }, { _id: 1, chapter: 1, order: 1, createdAt: 1 }).sort({ chapter: 1, order: 1, createdAt: 1 }).session(session)
    ]);
    // Group lectures and quizzes by chapter for efficient processing
    const lecturesByChapter = new Map();
    const quizzesByChapter = new Map();
    allLectures.forEach(lecture => {
        const chapterId = lecture.chapter.toString();
        if (!lecturesByChapter.has(chapterId)) {
            lecturesByChapter.set(chapterId, []);
        }
        lecturesByChapter.get(chapterId).push(lecture);
    });
    allQuizzes.forEach(quiz => {
        const chapterId = quiz.chapter.toString();
        if (!quizzesByChapter.has(chapterId)) {
            quizzesByChapter.set(chapterId, []);
        }
        quizzesByChapter.get(chapterId).push(quiz);
    });
    // STEP 3: Process all reordering logic in memory
    const chapterBulkOps = [];
    const lectureBulkOps = [];
    const quizBulkOps = [];
    // Process chapter reordering
    const chapterMap = new Map(allChapters.map(chapter => [
        chapter._id.toString(),
        { order: chapter.order, createdAt: chapter.createdAt }
    ]));
    // Validate all chapters exist
    const missingChapters = orderList.filter(({ chapterId }) => !chapterMap.has(chapterId));
    if (missingChapters.length > 0) {
        const missingIds = missingChapters.map(item => item.chapterId).join(', ');
        throw (0, errorHandler_1.createError)(`Chapters not found in course ${courseId}: ${missingIds}`, 404);
    }
    // Calculate chapter reordering
    const chapterFinalOrdering = new Map();
    const placedChapters = new Set();
    const sortedChapterReorders = [...orderList].sort((a, b) => a.order - b.order);
    for (const { chapterId, order } of sortedChapterReorders) {
        chapterFinalOrdering.set(chapterId, order);
        placedChapters.add(chapterId);
    }
    let nextChapterOrder = 1;
    const usedChapterOrders = new Set(Array.from(chapterFinalOrdering.values()));
    for (const [chapterId, data] of chapterMap) {
        if (!placedChapters.has(chapterId)) {
            while (usedChapterOrders.has(nextChapterOrder)) {
                nextChapterOrder++;
            }
            chapterFinalOrdering.set(chapterId, nextChapterOrder);
            usedChapterOrders.add(nextChapterOrder);
            nextChapterOrder++;
        }
    }
    // Create chapter bulk operations
    for (const [chapterId, newOrder] of chapterFinalOrdering) {
        chapterBulkOps.push({
            updateOne: {
                filter: { _id: chapterId, course: courseId },
                update: { $set: { order: newOrder } }
            }
        });
    }
    // Process lecture reordering for each chapter
    for (const chapterOrder of orderList) {
        if (chapterOrder.lectures && chapterOrder.lectures.length > 0) {
            const chapterId = chapterOrder.chapterId;
            const lectures = lecturesByChapter.get(chapterId) || [];
            const quizzes = quizzesByChapter.get(chapterId) || [];
            // Combine all items for this chapter
            const allItems = [
                ...lectures.map(lecture => ({
                    _id: lecture._id,
                    order: lecture.order,
                    createdAt: lecture.createdAt,
                    type: 'lecture'
                })),
                ...quizzes.map(quiz => ({
                    _id: quiz._id,
                    order: quiz.order,
                    createdAt: quiz.createdAt,
                    type: 'quiz'
                }))
            ].sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
            if (allItems.length === 0)
                continue;
            // Create item map for validation
            const itemMap = new Map(allItems.map(item => [
                item._id.toString(),
                { type: item.type, order: item.order, createdAt: item.createdAt }
            ]));
            // Validate lecture IDs exist
            const reorderRequests = chapterOrder.lectures.map(item => ({
                itemId: item.lectureId,
                itemType: 'lecture',
                order: item.order
            }));
            const missingItems = reorderRequests.filter(({ itemId }) => !itemMap.has(itemId));
            if (missingItems.length > 0) {
                const missingIds = missingItems.map(item => item.itemId).join(', ');
                throw (0, errorHandler_1.createError)(`Items not found in chapter ${chapterId}: ${missingIds}`, 404);
            }
            // Calculate final ordering for this chapter
            const finalOrdering = new Map();
            const placedItems = new Set();
            const sortedReorders = [...reorderRequests].sort((a, b) => a.order - b.order);
            for (const { itemId, order } of sortedReorders) {
                const itemData = itemMap.get(itemId);
                finalOrdering.set(itemId, { type: itemData.type, newOrder: order });
                placedItems.add(itemId);
            }
            let nextOrder = 1;
            const usedOrders = new Set(Array.from(finalOrdering.values()).map(item => item.newOrder));
            for (const [itemId, itemData] of itemMap) {
                if (!placedItems.has(itemId)) {
                    while (usedOrders.has(nextOrder)) {
                        nextOrder++;
                    }
                    finalOrdering.set(itemId, { type: itemData.type, newOrder: nextOrder });
                    usedOrders.add(nextOrder);
                    nextOrder++;
                }
            }
            // Create bulk operations for this chapter's items
            for (const [itemId, { type, newOrder }] of finalOrdering) {
                const operation = {
                    updateOne: {
                        filter: { _id: itemId, chapter: chapterId },
                        update: { $set: { order: newOrder } }
                    }
                };
                if (type === 'lecture') {
                    lectureBulkOps.push(operation);
                }
                else {
                    quizBulkOps.push(operation);
                }
            }
        }
    }
    // STEP 4: Execute all bulk operations in parallel (3 database calls total)
    const bulkPromises = [];
    if (chapterBulkOps.length > 0) {
        bulkPromises.push(chapter_model_1.default.bulkWrite(chapterBulkOps, {
            session,
            ordered: false,
            writeConcern: { w: 1 }
        }));
    }
    if (lectureBulkOps.length > 0) {
        bulkPromises.push(lecture_model_1.default.bulkWrite(lectureBulkOps, {
            session,
            ordered: false,
            writeConcern: { w: 1 }
        }));
    }
    if (quizBulkOps.length > 0) {
        bulkPromises.push(quiz_model_1.default.bulkWrite(quizBulkOps, {
            session,
            ordered: false,
            writeConcern: { w: 1 }
        }));
    }
    // Execute all bulk operations in parallel
    if (bulkPromises.length > 0) {
        await Promise.all(bulkPromises);
    }
};
exports.reorderChaptersAndLecturesBulkOptimized = reorderChaptersAndLecturesBulkOptimized;
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