"use strict";
// src/modules/discussions/discussion.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDiscussions = exports.deleteDiscussion = exports.updateDiscussion = exports.getDiscussionById = exports.getCourseDiscussions = exports.getLectureDiscussions = exports.answerQuestion = exports.createDiscussion = exports.getUserDiscussionsService = exports.getCourseDiscussionsService = exports.getLectureDiscussionsService = exports.getDiscussionByIdService = exports.deleteDiscussionService = exports.updateDiscussionService = exports.answerQuestionService = exports.createDiscussionService = void 0;
const errorHandler_1 = require("../../utils/errorHandler");
const withTransaction_1 = require("../../utils/withTransaction");
const cache_1 = require("../../utils/cache");
const discussion_model_1 = __importDefault(require("./discussion.model"));
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const course_model_1 = __importDefault(require("../courses/course.model"));
const enrollment_model_1 = __importDefault(require("../enrollments/enrollment.model"));
const notification_service_1 = require("../notifications/notification.service");
const DISCUSSION_CACHE_BASE = 'discussions';
// --- CORE SERVICE FUNCTIONS ---
/**
 * Create discussion
 */
const createDiscussionService = async (userId, lectureId, question) => {
    try {
        const discussion = await (0, withTransaction_1.withTransaction)(async (session) => {
            const lecture = await lecture_model_1.default.findById(lectureId).session(session);
            if (!lecture)
                throw (0, errorHandler_1.createError)('Lecture not found', 404);
            // Check if user is enrolled in the course
            const enrollment = await enrollment_model_1.default.findOne({
                student: userId,
                course: lecture.course
            }).session(session);
            if (!enrollment) {
                throw (0, errorHandler_1.createError)('Must be enrolled in the course to create discussions', 403);
            }
            const [discussion] = await discussion_model_1.default.create([{
                    user: userId,
                    lecture: lectureId,
                    course: lecture.course,
                    question,
                    answers: []
                }], { session, ordered: true });
            if (!discussion)
                throw (0, errorHandler_1.createError)("Failed to create discussion.", 500);
            // Notify instructor
            const course = await course_model_1.default.findById(lecture.course).session(session);
            if (course) {
                await (0, notification_service_1.createNotification)(course.instructor.toString(), 'new_question', `New question in ${lecture.title}`, discussion._id.toString());
            }
            // Invalidate caches (matching the cache key patterns from routes)
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:id=${discussion._id}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${lectureId}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${lecture.course}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
            return discussion.populate('user', 'name avatar');
        });
        return {
            success: true,
            data: discussion,
            message: 'Discussion created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Discussion creation failed',
            errors: [error.message]
        };
    }
};
exports.createDiscussionService = createDiscussionService;
/**
 * Answer question
 */
const answerQuestionService = async (discussionId, userId, text, isInstructor = false) => {
    try {
        const discussion = await (0, withTransaction_1.withTransaction)(async (session) => {
            const discussion = await discussion_model_1.default.findById(discussionId).session(session);
            if (!discussion)
                throw (0, errorHandler_1.createError)('Discussion not found', 404);
            // Check if user is enrolled in the course (unless they are instructor/admin)
            if (!isInstructor) {
                const enrollment = await enrollment_model_1.default.findOne({
                    student: userId,
                    course: discussion.course
                }).session(session);
                if (!enrollment) {
                    throw (0, errorHandler_1.createError)('Must be enrolled in the course to answer discussions', 403);
                }
            }
            discussion.answers.push({
                user: userId,
                text,
                isInstructorAnswer: isInstructor
            });
            await discussion.save({ session });
            // Notify question asker if different from answerer
            if (discussion.user.toString() !== userId) {
                await (0, notification_service_1.createNotification)(discussion.user.toString(), 'question_answered', `Your question has been answered`, discussionId);
            }
            // Invalidate caches (batch, non-blocking)
            Promise.all([
                (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`),
                (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`),
                (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`),
                (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:user:user=${discussion.user}`),
            ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            return discussion.populate([
                { path: 'user', select: 'name avatar' },
                { path: 'answers.user', select: 'name avatar' }
            ]);
        });
        return {
            success: true,
            data: discussion,
            message: 'Answer submitted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Answer submission failed',
            errors: [error.message]
        };
    }
};
exports.answerQuestionService = answerQuestionService;
/**
 * Update discussion
 */
const updateDiscussionService = async (discussionId, userId, question, userRole) => {
    try {
        const discussion = await (0, withTransaction_1.withTransaction)(async (session) => {
            const discussion = await discussion_model_1.default.findById(discussionId).session(session);
            if (!discussion)
                throw (0, errorHandler_1.createError)('Discussion not found', 404);
            // Check permissions: original poster, course instructor, or admin
            const isOriginalPoster = discussion.user.toString() === userId;
            const isAdmin = userRole === 'admin';
            let isCourseInstructor = false;
            if (!isOriginalPoster && !isAdmin) {
                // Check if user is the course instructor
                const course = await course_model_1.default.findById(discussion.course).session(session);
                if (course && course.instructor.toString() === userId) {
                    isCourseInstructor = true;
                }
            }
            if (!isOriginalPoster && !isAdmin && !isCourseInstructor) {
                throw (0, errorHandler_1.createError)('Unauthorized: Only the original poster, course instructor, or admin can update discussions', 403);
            }
            discussion.question = question;
            await discussion.save({ session });
            // Invalidate caches (matching the cache key patterns from routes)
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
            return discussion.populate('user', 'name avatar');
        });
        return {
            success: true,
            data: discussion,
            message: 'Discussion updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Discussion update failed',
            errors: [error.message]
        };
    }
};
exports.updateDiscussionService = updateDiscussionService;
/**
 * Delete discussion
 */
const deleteDiscussionService = async (discussionId, userId, userRole) => {
    try {
        await (0, withTransaction_1.withTransaction)(async (session) => {
            const discussion = await discussion_model_1.default.findById(discussionId).session(session);
            if (!discussion)
                throw (0, errorHandler_1.createError)('Discussion not found', 404);
            // Check permissions: original poster, course instructor, or admin
            const isOriginalPoster = discussion.user.toString() === userId;
            const isAdmin = userRole === 'admin';
            let isCourseInstructor = false;
            if (!isOriginalPoster && !isAdmin) {
                // Check if user is the course instructor
                const course = await course_model_1.default.findById(discussion.course).session(session);
                if (course && course.instructor.toString() === userId) {
                    isCourseInstructor = true;
                }
            }
            if (!isOriginalPoster && !isAdmin && !isCourseInstructor) {
                throw (0, errorHandler_1.createError)('Unauthorized: Only the original poster, course instructor, or admin can delete discussions', 403);
            }
            // Delete the discussion
            await discussion_model_1.default.findByIdAndDelete(discussionId).session(session);
            // Invalidate caches (matching the cache key patterns from routes)
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`);
            await (0, cache_1.invalidateCache)(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
        });
        return {
            success: true,
            data: undefined,
            message: 'Discussion deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Discussion deletion failed',
            errors: [error.message]
        };
    }
};
exports.deleteDiscussionService = deleteDiscussionService;
/**
 * Get discussion by ID with caching
 */
const getDiscussionByIdService = async (id, cacheKey) => {
    try {
        const discussion = await discussion_model_1.default.findById(id)
            .populate('user', 'name avatar')
            .populate('lecture', 'title order')
            .populate('answers.user', 'name avatar')
            .lean();
        if (!discussion) {
            return {
                success: false,
                message: 'Discussion not found',
                errors: ['No discussion found with the provided ID']
            };
        }
        const responseData = { discussion, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Discussion retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve discussion',
            errors: [error.message]
        };
    }
};
exports.getDiscussionByIdService = getDiscussionByIdService;
/**
 * Get lecture discussions with caching
 */
const getLectureDiscussionsService = async (lectureId, options = {}, cacheKey) => {
    try {
        const { page = 1, limit = 20, hasAnswers } = options;
        const skip = (page - 1) * limit;
        const query = { lecture: lectureId };
        if (hasAnswers !== undefined) {
            query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
        }
        const discussions = await discussion_model_1.default.find(query)
            .populate('user', 'name avatar')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await discussion_model_1.default.countDocuments(query);
        const responseData = {
            discussions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            cached: false
        };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Lecture discussions retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve lecture discussions',
            errors: [error.message]
        };
    }
};
exports.getLectureDiscussionsService = getLectureDiscussionsService;
/**
 * Get course discussions with caching
 */
const getCourseDiscussionsService = async (courseId, options = {}, cacheKey) => {
    try {
        const { page = 1, limit = 50, hasAnswers } = options;
        const skip = (page - 1) * limit;
        const query = { course: courseId };
        if (hasAnswers !== undefined) {
            query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
        }
        const discussions = await discussion_model_1.default.find(query)
            .populate('user', 'name avatar')
            .populate('lecture', 'title order')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await discussion_model_1.default.countDocuments(query);
        const responseData = {
            discussions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            cached: false
        };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Course discussions retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course discussions',
            errors: [error.message]
        };
    }
};
exports.getCourseDiscussionsService = getCourseDiscussionsService;
/**
 * Get user discussions with caching
 */
const getUserDiscussionsService = async (userId, options = {}, cacheKey) => {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const discussions = await discussion_model_1.default.find({ user: userId })
            .populate('lecture', 'title order')
            .populate('course', 'title thumbnail')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await discussion_model_1.default.countDocuments({ user: userId });
        const responseData = {
            discussions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            cached: false
        };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'User discussions retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve user discussions',
            errors: [error.message]
        };
    }
};
exports.getUserDiscussionsService = getUserDiscussionsService;
// Legacy functions for backward compatibility
exports.createDiscussion = exports.createDiscussionService;
exports.answerQuestion = exports.answerQuestionService;
const getLectureDiscussions = (lectureId) => discussion_model_1.default.find({ lecture: lectureId })
    .populate('user', 'name avatar')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });
exports.getLectureDiscussions = getLectureDiscussions;
const getCourseDiscussions = (courseId) => discussion_model_1.default.find({ course: courseId })
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });
exports.getCourseDiscussions = getCourseDiscussions;
const getDiscussionById = (discussionId) => discussion_model_1.default.findById(discussionId)
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar');
exports.getDiscussionById = getDiscussionById;
exports.updateDiscussion = exports.updateDiscussionService;
exports.deleteDiscussion = exports.deleteDiscussionService;
const getUserDiscussions = (userId) => discussion_model_1.default.find({ user: userId })
    .populate('lecture', 'title order')
    .populate('course', 'title')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });
exports.getUserDiscussions = getUserDiscussions;
//# sourceMappingURL=discussion.service.js.map