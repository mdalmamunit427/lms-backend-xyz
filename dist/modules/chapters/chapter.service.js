"use strict";
// src/modules/chapters/chapter.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChapterById = exports.getChaptersByCourse = exports.reorderChaptersWithLectures = exports.deleteChapterService = exports.updateChapter = exports.createChapterWithLectures = exports.createChapter = void 0;
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const errorHandler_1 = require("../../utils/errorHandler");
const withTransaction_1 = require("../../utils/withTransaction");
const chapter_model_1 = __importDefault(require("./chapter.model"));
const cache_1 = require("../../utils/cache");
const ownership_1 = require("../../utils/ownership");
const chapterReorder_1 = require("../../utils/chapterReorder");
// --- Type Definitions for Service Logic ---
const CHAPTER_CACHE_BASE = 'chapters';
const createChapter = async (data, userId, userRole) => {
    try {
        const chapter = await (0, withTransaction_1.withTransaction)(async (session) => {
            // SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(data.course, userId, userRole, session);
            let order;
            if (data.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create chapter with temporary order first (since order field is required)
                const tempOrder = (await chapter_model_1.default.countDocuments({ course: data.course }).session(session)) + 1000; // High temporary order
                const createdChapters = await chapter_model_1.default.create([{ ...data, order: tempOrder }], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                const chapter = createdChapters[0];
                // Apply smart reorder logic to place the chapter at the desired position
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(data.course, [{ chapterId: chapter._id.toString(), order: data.order }], session);
                // Invalidate relevant caches
                await (0, cache_1.invalidateCache)(`course:id=${data.course}`);
                await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:courseId=${data.course}`);
                await (0, cache_1.invalidateCache)("courses:list");
                return chapter;
            }
            else {
                // Auto-calculate order (existing behavior)
                order = (await chapter_model_1.default.countDocuments({ course: data.course }).session(session)) + 1;
                const [chapter] = await chapter_model_1.default.create([{ ...data, order }], { session, ordered: true });
                // Invalidate relevant caches
                await (0, cache_1.invalidateCache)(`course:id=${data.course}`);
                await (0, cache_1.invalidateCache)("courses:list");
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
            await (0, ownership_1.validateCourseAndOwnership)(chapterData.course, userId, userRole, session);
            let chapter;
            if (chapterData.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create chapter with temporary high order first (since order field is required)
                const tempOrder = (await chapter_model_1.default.countDocuments({ course: chapterData.course }).session(session)) + 1000;
                const createdChapters = await chapter_model_1.default.create([{ ...chapterData, order: tempOrder }], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                chapter = createdChapters[0];
                // Apply smart reorder logic to place the chapter at the desired position
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(chapterData.course, [{ chapterId: chapter._id.toString(), order: chapterData.order }], session);
            }
            else {
                // Auto-calculate order (existing behavior)
                const order = (await chapter_model_1.default.countDocuments({ course: chapterData.course }).session(session)) + 1;
                const createdChapters = await chapter_model_1.default.create([{ ...chapterData, order }], { session, ordered: true });
                if (createdChapters.length === 0 || !createdChapters[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create chapter", 500);
                }
                chapter = createdChapters[0];
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
            // 6. Attach lectures to chapter content array
            chapter.content = createdLectures.map((lec) => ({
                type: "lecture",
                refId: lec._id,
                title: lec.title,
                isPreview: lec.isPreview
            }));
            await chapter.save({ session });
            // 7. Invalidate caches
            await (0, cache_1.invalidateCache)(`course:id=${chapterData.course}`);
            await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:courseId=${chapterData.course}`);
            await (0, cache_1.invalidateCache)("courses:list");
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
 * Update Chapter (title / order)
 */
const updateChapter = async (id, data, userId, userRole) => {
    try {
        const chapter = await (0, withTransaction_1.withTransaction)(async (session) => {
            const chapter = await chapter_model_1.default.findById(id).session(session);
            if (!chapter)
                throw (0, errorHandler_1.createError)("Chapter not found", 404);
            // SECURITY: Enforce ownership check on the course the chapter belongs to
            await (0, ownership_1.validateCourseAndOwnership)(chapter.course.toString(), userId, userRole, session);
            if (data.title !== undefined)
                chapter.title = data.title;
            if (data.order !== undefined && data.order !== chapter.order) {
                // Apply smart reorder logic for chapter order changes
                await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(chapter.course.toString(), [{ chapterId: id, order: data.order }], session);
            }
            await chapter.save({ session });
            // Invalidate caches
            await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:${chapter._id}`);
            await (0, cache_1.invalidateCache)(`course:id=${chapter.course}`);
            await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:courseId=${chapter.course}`);
            await (0, cache_1.invalidateCache)("courses:list");
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
            await (0, ownership_1.validateCourseAndOwnership)(chapter.course.toString(), userId, userRole, session);
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
 * Reorder Chapters with Lectures
 */
const reorderChaptersWithLectures = async (courseId, orderList, userId, userRole) => {
    try {
        await (0, withTransaction_1.withTransaction)(async (session) => {
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(courseId, userId, userRole, session);
            // Note: Validation is handled by the smart reorder functions
            // --- CORE MUTATION 1: Update Chapter Orders using smart reorder ---
            // Convert chapter order list to the utility format
            const chapterReorderRequests = orderList.map(item => ({
                chapterId: item.chapterId,
                order: item.order
            }));
            // Apply smart reorder logic for chapters (handles conflicts automatically)
            await (0, chapterReorder_1.reorderCourseChaptersWithConflictResolution)(courseId, chapterReorderRequests, session);
            // --- CORE MUTATION 2: Update Lecture Orders within each chapter using smart reorder ---
            for (const chapterOrder of orderList) {
                if (chapterOrder.lectures && chapterOrder.lectures.length > 0) {
                    // Convert lecture order list to the utility format
                    const reorderRequests = chapterOrder.lectures.map(item => ({
                        itemId: item.lectureId,
                        itemType: 'lecture',
                        order: item.order
                    }));
                    // Apply smart reorder logic using the utility (handles conflicts automatically)
                    await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(chapterOrder.chapterId, reorderRequests, session);
                }
            }
            // 3. Invalidate caches (Ensuring keys match the standard pattern)
            for (const c of orderList) {
                // Invalidate single chapter view
                await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:${c.chapterId}`);
            }
            // Invalidate course detail and chapters list
            await (0, cache_1.invalidateCache)(`course:id=${courseId}`);
            await (0, cache_1.invalidateCache)(`${CHAPTER_CACHE_BASE}:courseId=${courseId}`);
            // Invalidate list cache
            await (0, cache_1.invalidateCache)("courses:list");
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