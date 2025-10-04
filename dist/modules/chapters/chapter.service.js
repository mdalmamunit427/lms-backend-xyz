"use strict";
// src/modules/chapters/chapter.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChapterById = exports.getChaptersByCourse = exports.reorderChaptersWithLectures = exports.deleteChapterService = exports.updateChapter = exports.createChapterWithLectures = exports.createChapter = exports.updateChapterDuration = void 0;
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const errorHandler_1 = require("../../utils/errorHandler");
const withTransaction_1 = require("../../utils/withTransaction");
const chapter_model_1 = __importDefault(require("./chapter.model"));
const cache_1 = require("../../utils/cache");
const ownership_1 = require("../../utils/ownership");
const course_service_1 = require("../courses/course.service");
const chapterReorder_1 = require("../../utils/chapterReorder");
// --- Type Definitions for Service Logic ---
const CHAPTER_CACHE_BASE = 'chapters';
// Utility function to update chapter duration (optimized - minimal DB calls)
const updateChapterDuration = async (chapterId, session) => {
    const chapter = await chapter_model_1.default.findById(chapterId).session(session);
    if (!chapter)
        return;
    // Get all lectures in this chapter (only duration field)
    const lectures = await lecture_model_1.default.find({ chapter: chapterId }).select('duration').session(session);
    // Calculate total duration
    const totalDuration = lectures.reduce((total, lecture) => total + (lecture.duration || 0), 0);
    // Update chapter duration
    chapter.chapterDuration = totalDuration;
    await chapter.save({ session });
    // Note: Course duration will be calculated by aggregation pipeline on next API call
    // This avoids unnecessary DB calls for course updates
};
exports.updateChapterDuration = updateChapterDuration;
const createChapter = async (data, userId, userRole) => {
    try {
        const chapter = await (0, withTransaction_1.withTransaction)(async (session) => {
            // SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(data.course, userId, userRole);
            let order;
            if (data.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create chapter with temporary order first (since order field is required)
                const tempOrder = (await chapter_model_1.default.countDocuments({ course: data.course }).session(session)) + 1000; // High temporary order
                const createdChapters = await chapter_model_1.default.create([{
                        title: data.title,
                        course: data.course,
                        order: tempOrder,
                        chapterDuration: 0
                    }], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                const chapter = createdChapters[0];
                // Apply smart reorder logic to place the chapter at the desired position
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(data.course, [{ chapterId: chapter._id.toString(), order: data.order }], session);
                // Invalidate relevant caches (non-blocking, async)
                (0, cache_1.invalidateCacheAsync)(`course:id=${data.course}`);
                (0, cache_1.invalidateCacheAsync)(`${CHAPTER_CACHE_BASE}:courseId=${data.course}`);
                (0, cache_1.invalidateCacheAsync)("courses:list");
                return chapter;
            }
            else {
                // Auto-calculate order (existing behavior)
                order = (await chapter_model_1.default.countDocuments({ course: data.course }).session(session)) + 1;
                const [chapter] = await chapter_model_1.default.create([{
                        title: data.title,
                        course: data.course,
                        order: order,
                        chapterDuration: 0
                    }], { session, ordered: true });
                // Invalidate relevant caches (batch, non-blocking)
                Promise.all([
                    (0, cache_1.invalidateCache)(`course:id=${data.course}`),
                    (0, cache_1.invalidateCache)("courses:list"),
                ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
                return chapter;
            }
        });
        return {
            success: true,
            data: chapter,
            message: 'Chapter created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Chapter creation failed',
            errors: [error.message]
        };
    }
};
exports.createChapter = createChapter;
/**
 * Create Chapter with multiple Lectures (Transactional)
 */
const createChapterWithLectures = async (chapterData, lecturesData, userId, userRole) => {
    try {
        const result = await (0, withTransaction_1.withTransaction)(async (session) => {
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(chapterData.course, userId, userRole);
            let chapter;
            if (chapterData.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create chapter with temporary high order first (since order field is required)
                const tempOrder = (await chapter_model_1.default.countDocuments({ course: chapterData.course }).session(session)) + 1000;
                const chapterDataClean = {
                    title: chapterData.title,
                    course: chapterData.course,
                    order: tempOrder,
                    chapterDuration: 0
                };
                const createdChapters = await chapter_model_1.default.create([chapterDataClean], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                chapter = createdChapters[0];
                // Explicitly remove content field if it exists using MongoDB operation
                await chapter_model_1.default.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
                // Apply smart reorder logic to place the chapter at the desired position
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(chapterData.course, [{ chapterId: chapter._id.toString(), order: chapterData.order }], session);
            }
            else {
                // Auto-calculate order (existing behavior)
                const order = (await chapter_model_1.default.countDocuments({ course: chapterData.course }).session(session)) + 1;
                const chapterDataClean = {
                    title: chapterData.title,
                    course: chapterData.course,
                    order: order,
                    chapterDuration: 0
                };
                const createdChapters = await chapter_model_1.default.create([chapterDataClean], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                chapter = createdChapters[0];
                // Explicitly remove content field if it exists using MongoDB operation
                await chapter_model_1.default.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
            }
            // 4. Prepare lecture data
            const lecturesToCreate = lecturesData.map((lec, idx) => ({
                ...lec,
                chapter: chapter._id,
                course: chapterData.course,
                order: idx + 1, // Auto-order lectures within the chapter
            }));
            // 5. Create lectures (Transactional part 2) - FIX: Added ordered: true
            const createdLectures = await lecture_model_1.default.create(lecturesToCreate, { session, ordered: true });
            // 6. Lectures are now stored in lectures collection - no need to update chapter content
            // 7. Calculate and update chapter duration
            const newChapterDuration = createdLectures.reduce((total, lecture) => total + (lecture.duration || 0), 0);
            chapter.chapterDuration = newChapterDuration;
            // Explicitly remove content field before saving using MongoDB operation
            await chapter_model_1.default.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
            await chapter.save({ session });
            // 8. Update course total duration in database
            await (0, course_service_1.updateCourseDuration)(chapterData.course, undefined, session);
            // 9. Invalidate caches (non-blocking)
            (0, cache_1.invalidateCacheAsync)(`course:id=${chapterData.course}`);
            (0, cache_1.invalidateCacheAsync)(`${CHAPTER_CACHE_BASE}:courseId=${chapterData.course}`);
            (0, cache_1.invalidateCacheAsync)("courses:list");
            await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:${chapter._id}`);
            return { chapter, lectures: createdLectures };
        });
        return {
            success: true,
            data: result,
            message: 'Chapter with lectures created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Chapter with lectures creation failed',
            errors: [error.message]
        };
    }
};
exports.createChapterWithLectures = createChapterWithLectures;
/**
 * Update Chapter (title / order) - OPTIMIZED VERSION
 * Reduces database calls by optimizing validation and reordering
 */
const updateChapter = async (id, data, userId, userRole) => {
    try {
        const chapter = await (0, withTransaction_1.withTransaction)(async (session) => {
            // OPTIMIZATION: Single query with projection to get only needed fields
            const chapter = await chapter_model_1.default.findById(id, {
                _id: 1,
                title: 1,
                order: 1,
                course: 1
            }).session(session);
            if (!chapter)
                throw (0, errorHandler_1.createError)("Chapter not found", 404);
            // SECURITY: Enforce ownership check on the course the chapter belongs to
            await (0, ownership_1.validateCourseAndOwnership)(chapter.course.toString(), userId, userRole);
            // OPTIMIZATION: Only update title if provided and different
            if (data.title !== undefined && data.title !== chapter.title) {
                chapter.title = data.title;
            }
            // OPTIMIZATION: Only reorder if order is provided and different
            if (data.order !== undefined && data.order !== chapter.order) {
                // Apply smart reorder logic for chapter order changes
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(chapter.course.toString(), [{ chapterId: id, order: data.order }], session);
            }
            // OPTIMIZATION: Only save if there are actual changes
            if (data.title !== undefined && data.title !== chapter.title) {
                await chapter.save({ session });
            }
            // OPTIMIZATION: Batch cache invalidation operations
            const cacheKeys = [
                `${CHAPTER_CACHE_BASE}:${chapter._id}`,
                `course:id=${chapter.course}`,
                `${CHAPTER_CACHE_BASE}:courseId=${chapter.course}`,
                "courses:list"
            ];
            // Execute cache invalidation in parallel (non-blocking)
            Promise.all(cacheKeys.map(key => (0, cache_1.invalidateCache)(key)))
                .catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            return chapter;
        });
        return {
            success: true,
            data: chapter,
            message: 'Chapter updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Chapter update failed',
            errors: [error.message]
        };
    }
};
exports.updateChapter = updateChapter;
const deleteChapterService = async (chapterId, userId, userRole) => {
    try {
        const chapter = await (0, withTransaction_1.withTransaction)(async (session) => {
            const chapter = await chapter_model_1.default.findById(chapterId).session(session);
            if (!chapter)
                throw (0, errorHandler_1.createError)("Chapter not found", 404);
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(chapter.course.toString(), userId, userRole);
            // 2. CASCADING DELETE: Delete all associated Lectures (Lessons)
            // If this fails, the chapter deletion will roll back.
            await lecture_model_1.default.deleteMany({ chapter: chapterId }, { session });
            // 3. Delete the Chapter
            const deletedChapter = await chapter_model_1.default.findByIdAndDelete(chapterId, { session });
            // 4. Invalidate relevant caches
            if (deletedChapter) {
                await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:${chapterId}`);
                await (0, cache_1.invalidateCache)(`course:id=${deletedChapter.course}`);
                await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:courseId=${deletedChapter.course}`);
                await (0, cache_1.invalidateCache)("courses:list");
            }
            return deletedChapter;
        });
        return {
            success: true,
            data: chapter,
            message: 'Chapter deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Chapter deletion failed',
            errors: [error.message]
        };
    }
};
exports.deleteChapterService = deleteChapterService;
/**
 * Reorder Chapters with Lectures - ULTRA OPTIMIZED VERSION
 * Reduces database calls from N+2 to just 3 calls total
 */
const reorderChaptersWithLectures = async (courseId, orderList, userId, userRole) => {
    try {
        await (0, withTransaction_1.withTransaction)(async (session) => {
            // 1. SECURITY: Enforce ownership (single call)
            await (0, ownership_1.validateCourseAndOwnership)(courseId, userId, userRole);
            // 2. ULTRA OPTIMIZATION: Single bulk reorder operation for all chapters and lectures
            await (0, chapterReorder_1.reorderChaptersAndLecturesBulkOptimized)(courseId, orderList, session);
            // 3. OPTIMIZATION: Batch cache invalidation operations
            const cacheKeys = [
                `course:id=${courseId}`,
                `${CHAPTER_CACHE_BASE}:courseId=${courseId}`,
                "courses:list",
                ...orderList.map(c => `${CHAPTER_CACHE_BASE}:${c.chapterId}`)
            ];
            // Execute cache invalidation in parallel (non-blocking)
            Promise.all(cacheKeys.map(key => (0, cache_1.invalidateCache)(key)))
                .catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            return true;
        });
        return {
            success: true,
            data: true,
            message: 'Chapters and lectures reordered successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Chapter reordering failed',
            errors: [error.message]
        };
    }
};
exports.reorderChaptersWithLectures = reorderChaptersWithLectures;
/**
 * Get Chapters for a Course (IMPLEMENTING CACHING)
 */
const getChaptersByCourse = async (courseId, cacheKey) => {
    try {
        const chapters = await chapter_model_1.default.find({ course: courseId }).sort({ order: 1 }).lean();
        // Set cache on DB read
        const responseData = { chapters, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Chapters retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve chapters',
            errors: [error.message]
        };
    }
};
exports.getChaptersByCourse = getChaptersByCourse;
/**
 * Get Single Chapter (IMPLEMENTING CACHING)
 */
const getChapterById = async (id, cacheKey) => {
    try {
        const chapter = await chapter_model_1.default.findById(id).lean();
        if (!chapter) {
            return {
                success: false,
                message: 'Chapter not found',
                errors: ['No chapter found with the provided ID']
            };
        }
        // Set cache on DB read
        const responseData = { chapter, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Chapter retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve chapter',
            errors: [error.message]
        };
    }
};
exports.getChapterById = getChapterById;
//# sourceMappingURL=chapter.service.js.map