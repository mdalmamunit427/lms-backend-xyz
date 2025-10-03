"use strict";
// src/modules/lectures/lecture.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderLecturesService = exports.deleteLectureService = exports.updateLectureService = exports.getLecturesByChapterService = exports.getLectureByIdService = exports.createLectureService = void 0;
const lecture_model_1 = __importDefault(require("./lecture.model"));
const chapter_model_1 = __importDefault(require("../chapters/chapter.model")); // Assuming Chapter model exists
const cache_1 = require("../../utils/cache");
const withTransaction_1 = require("../../utils/withTransaction");
const errorHandler_1 = require("../../utils/errorHandler");
// Importing the shared security helper
const ownership_1 = require("../../utils/ownership");
const chapterReorder_1 = require("../../utils/chapterReorder");
const LECTURE_CACHE_BASE = 'lectures';
// --- CORE SERVICE FUNCTIONS ---
/**
 * Creates a new lecture with smart conflict resolution for order, and atomically links it to the parent chapter.
 */
const createLectureService = async (data, userId, userRole) => {
    try {
        const lecture = await (0, withTransaction_1.withTransaction)(async (session) => {
            // 1. SECURITY: Enforce course ownership (Uses shared utility)
            await (0, ownership_1.validateCourseAndOwnership)(data.course, userId, userRole, session);
            // 2. FETCH and VALIDATE CHAPTER
            const chapter = await chapter_model_1.default.findById(data.chapter).session(session);
            // Ensure chapter exists AND belongs to the course ID provided
            if (!chapter || chapter.course.toString() !== data.course) {
                throw (0, errorHandler_1.createError)("Chapter not found or does not belong to the specified course.", 404);
            }
            let lecture;
            if (data.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create lecture with temporary high order first (since order field is required)
                const tempOrder = (await lecture_model_1.default.countDocuments({ chapter: data.chapter }).session(session)) + 1000;
                const createdLectures = await lecture_model_1.default.create([{ ...data, order: tempOrder }], { session, ordered: true });
                if (createdLectures.length === 0 || !createdLectures[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create lecture.", 500);
                }
                lecture = createdLectures[0];
                // Apply smart reorder logic to place the lecture at the desired position
                await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(data.chapter, [{ itemId: lecture._id.toString(), itemType: 'lecture', order: data.order }], session);
            }
            else {
                // Auto-calculate order (existing behavior)
                const order = (await lecture_model_1.default.countDocuments({ chapter: data.chapter }).session(session)) + 1;
                const createdLectures = await lecture_model_1.default.create([{ ...data, order }], { session, ordered: true });
                if (createdLectures.length === 0 || !createdLectures[0]) {
                    throw (0, errorHandler_1.createError)("Failed to create lecture.", 500);
                }
                lecture = createdLectures[0];
            }
            // 5. Link the lecture to the parent chapter (Transactional write)
            chapter.content.push({
                type: 'lecture',
                refId: lecture._id,
                title: lecture.title,
                isPreview: lecture.isPreview || false
            });
            await chapter.save({ session });
            // 6. Invalidate relevant caches
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:${lecture._id}`);
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:chapterId=${chapter._id}*`);
            await (0, cache_1.invalidateCache)(`chapter:${chapter._id}`);
            await (0, cache_1.invalidateCache)(`course:id=${data.course}`);
            return lecture;
        });
        return {
            success: true,
            data: lecture,
            message: 'Lecture created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Lecture creation failed',
            errors: [error.message]
        };
    }
};
exports.createLectureService = createLectureService;
/**
 * Gets a single lecture by ID.
 * Implements security: Hides videoUrl if the user is not enrolled or is not the instructor/admin.
 */
const getLectureByIdService = async (id, cacheKey, isEnrolled) => {
    try {
        const lecture = await lecture_model_1.default.findById(id).lean();
        if (!lecture) {
            return {
                success: false,
                message: 'Lecture not found',
                errors: ['No lecture found with the provided ID']
            };
        }
        // SECURITY: Hide videoUrl if not a preview lecture AND user is not authorized/enrolled
        if (!lecture.isPreview && !isEnrolled) {
            lecture.videoUrl = ''; // Hide the video URL
        }
        await (0, cache_1.setCache)(cacheKey, { lecture, cached: false });
        return {
            success: true,
            data: lecture,
            message: 'Lecture retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve lecture',
            errors: [error.message]
        };
    }
};
exports.getLectureByIdService = getLectureByIdService;
/**
 * Gets all lectures for a chapter.
 * Implements security: Hides videoUrl for non-preview content.
 */
const getLecturesByChapterService = async (chapterId, cacheKey, isEnrolled) => {
    try {
        const lectures = await lecture_model_1.default.find({ chapter: chapterId }).sort({ order: 1 }).lean();
        // SECURITY: Hide videoUrl for non-preview content
        lectures.forEach(lec => {
            if (!lec.isPreview && !isEnrolled) {
                lec.videoUrl = '';
            }
        });
        const responseData = { lectures, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Lectures retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve lectures',
            errors: [error.message]
        };
    }
};
exports.getLecturesByChapterService = getLecturesByChapterService;
/**
 * Updates a lecture with smart order conflict resolution.
 */
const updateLectureService = async (id, data, userId, userRole) => {
    try {
        const lecture = await (0, withTransaction_1.withTransaction)(async (session) => {
            const lecture = await lecture_model_1.default.findById(id).session(session);
            if (!lecture)
                throw (0, errorHandler_1.createError)("Lecture not found", 404);
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(lecture.course.toString(), userId, userRole, session);
            // 2. Check if order is being changed
            const isOrderChange = data.order !== undefined && data.order !== lecture.order;
            if (isOrderChange) {
                // Apply smart reorder logic when order is being changed
                await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(lecture.chapter.toString(), [{ itemId: id, itemType: 'lecture', order: data.order }], session);
                // Remove order from data since it's already handled by reorder logic
                const { order, ...otherData } = data;
                Object.assign(lecture, otherData);
            }
            else {
                // Normal update for non-order fields
                Object.assign(lecture, data);
            }
            await lecture.save({ session });
            // 3. Invalidate caches
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:${lecture._id}`);
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:chapterId=${lecture.chapter}*`);
            await (0, cache_1.invalidateCache)(`chapter:${lecture.chapter}`);
            await (0, cache_1.invalidateCache)(`course:id=${lecture.course}`);
            return lecture;
        });
        return {
            success: true,
            data: lecture,
            message: 'Lecture updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Lecture update failed',
            errors: [error.message]
        };
    }
};
exports.updateLectureService = updateLectureService;
/**
 * Deletes a lecture and unlinks it from the parent chapter (Transactional Cascading Delete).
 */
const deleteLectureService = async (id, userId, userRole) => {
    try {
        const deletedLecture = await (0, withTransaction_1.withTransaction)(async (session) => {
            const lecture = await lecture_model_1.default.findById(id).session(session);
            if (!lecture)
                throw (0, errorHandler_1.createError)("Lecture not found", 404);
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(lecture.course.toString(), userId, userRole, session);
            // 2. Delete the lecture
            const deletedLecture = await lecture_model_1.default.findByIdAndDelete(id, { session });
            // 3. Unlink from the parent chapter (Critical Integrity Step)
            await chapter_model_1.default.findByIdAndUpdate(deletedLecture.chapter, { $pull: { lectures: deletedLecture._id } }, { session });
            // 4. Invalidate caches
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:${id}`);
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:chapterId=${deletedLecture.chapter}*`);
            await (0, cache_1.invalidateCache)(`chapter:${deletedLecture.chapter}`);
            await (0, cache_1.invalidateCache)(`course:id=${lecture.course}`);
            return deletedLecture;
        });
        return {
            success: true,
            data: deletedLecture,
            message: 'Lecture deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Lecture deletion failed',
            errors: [error.message]
        };
    }
};
exports.deleteLectureService = deleteLectureService;
/**
 * Reorders lectures within a chapter with conflict resolution (Transactional Bulk Write).
 */
const reorderLecturesService = async (chapterId, orderList, userId, userRole) => {
    try {
        const result = await (0, withTransaction_1.withTransaction)(async (session) => {
            const chapter = await chapter_model_1.default.findById(chapterId).session(session);
            if (!chapter)
                throw (0, errorHandler_1.createError)("Chapter not found", 404);
            // SECURITY: Enforce ownership on the parent chapter
            const course = await (0, ownership_1.validateCourseAndOwnership)(chapter.course.toString(), userId, userRole, session);
            // Convert lecture order list to the utility format
            const reorderRequests = orderList.map(item => ({
                itemId: item.lectureId,
                itemType: 'lecture',
                order: item.order
            }));
            // Apply smart reorder logic using the utility
            const finalOrdering = await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(chapterId, reorderRequests, session);
            // Invalidate caches
            await (0, cache_1.invalidateCache)(`${LECTURE_CACHE_BASE}:chapterId=${chapterId}*`);
            await (0, cache_1.invalidateCache)(`chapter:${chapterId}`);
            await (0, cache_1.invalidateCache)(`course:id=${course._id}`);
            return {
                success: true,
                message: "Lectures reordered successfully",
                newOrder: finalOrdering.map(item => ({
                    lectureId: item.itemId,
                    newOrder: item.newOrder
                }))
            };
        });
        return {
            success: true,
            data: result,
            message: 'Lectures reordered successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Lecture reordering failed',
            errors: [error.message]
        };
    }
};
exports.reorderLecturesService = reorderLecturesService;
//# sourceMappingURL=lecture.service.js.map