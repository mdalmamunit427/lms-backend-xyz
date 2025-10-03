"use strict";
// src/modules/quizes/quiz.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizResultsService = exports.submitQuizAttemptService = exports.getCourseQuizzesService = exports.getQuizzesByChapterService = exports.getQuizByIdService = exports.deleteQuizService = exports.updateQuizService = exports.createQuizService = void 0;
const errorHandler_1 = require("../../utils/errorHandler");
const errorHandler_2 = require("../../utils/errorHandler");
const withTransaction_1 = require("../../utils/withTransaction");
const cache_1 = require("../../utils/cache");
const ownership_1 = require("../../utils/ownership");
const chapterReorder_1 = require("../../utils/chapterReorder");
const quiz_model_1 = __importDefault(require("./quiz.model"));
const chapter_model_1 = __importDefault(require("../chapters/chapter.model"));
const progress_model_1 = __importDefault(require("../progress/progress.model"));
const enrollment_model_1 = __importDefault(require("../enrollments/enrollment.model"));
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const progress_service_1 = require("../progress/progress.service");
const QUIZ_CACHE_BASE = 'quizzes';
// --- CORE SERVICE FUNCTIONS ---
/**
 * Create a new quiz with smart order conflict resolution
 */
const createQuizService = async (data, userId, userRole) => {
    try {
        const quiz = await (0, withTransaction_1.withTransaction)(async (session) => {
            let courseId;
            let chapterId;
            let lectureId;
            // 1. DETERMINE FORMAT: Lecture-based or Course/Chapter-based
            if (data.lecture) {
                // Lecture-based format (new format)
                const lecture = await lecture_model_1.default.findById(data.lecture).session(session);
                if (!lecture) {
                    throw new errorHandler_1.AppError("Lecture not found", 404);
                }
                courseId = lecture.course.toString();
                chapterId = lecture.chapter.toString();
                lectureId = data.lecture;
            }
            else if (data.course && data.chapter) {
                // Course/Chapter-based format (old format)
                courseId = data.course;
                chapterId = data.chapter;
                lectureId = undefined;
            }
            else {
                throw new errorHandler_1.AppError("Either lecture ID or both course and chapter IDs must be provided", 400);
            }
            // 2. SECURITY: Enforce course ownership
            await (0, ownership_1.validateCourseAndOwnership)(courseId, userId, userRole, session);
            // 3. Validate chapter belongs to course
            const chapter = await (0, chapterReorder_1.validateChapterBelongsToCourse)(chapterId, courseId, session);
            // 4. Auto-calculate order if not provided
            const targetOrder = data.order || await (0, chapterReorder_1.getNextAvailableOrder)(chapterId, session);
            // 5. Prepare quiz data
            const quizData = {
                course: courseId,
                chapter: chapterId,
                title: data.title,
                order: targetOrder,
                questions: data.questions.map(q => ({
                    questionText: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation
                }))
            };
            // 6. Create quiz with target order
            const [quiz] = await quiz_model_1.default.create([quizData], { session, ordered: true });
            if (!quiz)
                throw new errorHandler_1.AppError("Failed to create quiz.", 500);
            // 7. Apply smart reorder logic if order was specified
            if (data.order) {
                await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(chapterId, [{ itemId: quiz._id.toString(), itemType: 'quiz', order: data.order }], session);
            }
            else {
                // For auto-calculated order, just update chapter content normally
                await (0, chapterReorder_1.updateChapterContentArray)(chapterId, session);
            }
            // 8. Invalidate caches
            await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:${quiz._id}`);
            await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:chapterId=${chapter._id}`);
            await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:courseId=${courseId}`);
            await (0, cache_1.invalidateCache)(`chapter:${chapter._id}`);
            await (0, cache_1.invalidateCache)(`course:id=${courseId}`);
            return quiz;
        });
        return {
            success: true,
            data: quiz,
            message: 'Quiz created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Quiz creation failed',
            errors: [error.message]
        };
    }
};
exports.createQuizService = createQuizService;
/**
 * Update quiz with smart order conflict resolution
 */
const updateQuizService = async (id, data, userId, userRole) => {
    try {
        const quiz = await (0, withTransaction_1.withTransaction)(async (session) => {
            const quiz = await quiz_model_1.default.findById(id).session(session);
            if (!quiz)
                throw new errorHandler_1.AppError("Quiz not found", 404);
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(quiz.course.toString(), userId, userRole, session);
            // 2. Check if order is being changed
            const isOrderChange = data.order !== undefined && data.order !== quiz.order;
            if (isOrderChange) {
                // Apply smart reorder logic when order is being changed
                await (0, chapterReorder_1.reorderChapterItemsWithConflictResolution)(quiz.chapter.toString(), [{ itemId: id, itemType: 'quiz', order: data.order }], session);
                // Remove order from data since it's already handled by reorder logic
                const { order, ...otherData } = data;
                Object.assign(quiz, otherData);
            }
            else {
                // Normal update for non-order fields
                Object.assign(quiz, data);
            }
            await quiz.save({ session });
            // 3. Update chapter content if title changed
            if (data.title) {
                await chapter_model_1.default.updateOne({ "content.refId": quiz._id }, { $set: { "content.$.title": data.title } }, { session });
            }
            // 4. Invalidate caches (batch, non-blocking)
            Promise.all([
                (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:${quiz._id}`),
                (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:chapterId=${quiz.chapter}`),
                (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:courseId=${quiz.course}`),
                (0, cache_1.invalidateCache)(`chapter:${quiz.chapter}`),
            ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            await (0, cache_1.invalidateCache)(`course:id=${quiz.course}`);
            return quiz;
        });
        return {
            success: true,
            data: quiz,
            message: 'Quiz updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Quiz update failed',
            errors: [error.message]
        };
    }
};
exports.updateQuizService = updateQuizService;
/**
 * Delete quiz
 */
const deleteQuizService = async (id, userId, userRole) => {
    try {
        const deletedQuiz = await (0, withTransaction_1.withTransaction)(async (session) => {
            const quiz = await quiz_model_1.default.findById(id).session(session);
            if (!quiz)
                throw new errorHandler_1.AppError("Quiz not found", 404);
            // 1. SECURITY: Enforce ownership
            await (0, ownership_1.validateCourseAndOwnership)(quiz.course.toString(), userId, userRole, session);
            // 2. Remove from chapter content
            await chapter_model_1.default.updateOne({ "content.refId": quiz._id }, { $pull: { content: { refId: quiz._id } } }, { session });
            // 3. Delete quiz
            const deletedQuiz = await quiz_model_1.default.findByIdAndDelete(id, { session });
            // 4. Invalidate caches
            if (deletedQuiz) {
                await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:${id}`);
                await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:chapterId=${deletedQuiz.chapter}`);
                await (0, cache_1.invalidateCache)(`${QUIZ_CACHE_BASE}:courseId=${deletedQuiz.course}`);
                await (0, cache_1.invalidateCache)(`chapter:${deletedQuiz.chapter}`);
                await (0, cache_1.invalidateCache)(`course:id=${deletedQuiz.course}`);
            }
            return deletedQuiz;
        });
        return {
            success: true,
            data: deletedQuiz,
            message: 'Quiz deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Quiz deletion failed',
            errors: [error.message]
        };
    }
};
exports.deleteQuizService = deleteQuizService;
/**
 * Get quiz by ID with security filtering
 */
const getQuizByIdService = async (id, cacheKey, isEnrolled) => {
    try {
        const quiz = await quiz_model_1.default.findById(id)
            .populate('course', 'title')
            .populate('chapter', 'title order')
            .lean();
        if (!quiz) {
            return {
                success: false,
                message: 'Quiz not found',
                errors: ['No quiz found with the provided ID']
            };
        }
        // SECURITY: Hide correct answers if not enrolled or instructor/admin
        if (!isEnrolled) {
            quiz.questions = quiz.questions.map(q => ({
                questionText: q.questionText,
                options: q.options,
                correctAnswer: -1, // Hide correct answer
                explanation: undefined // Hide explanation
            }));
        }
        const responseData = { quiz, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Quiz retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve quiz',
            errors: [error.message]
        };
    }
};
exports.getQuizByIdService = getQuizByIdService;
/**
 * Get quizzes by chapter
 */
const getQuizzesByChapterService = async (chapterId, cacheKey, isEnrolled) => {
    try {
        const quizzes = await quiz_model_1.default.find({ chapter: chapterId }).sort({ order: 1 }).lean();
        // SECURITY: Hide answers for non-enrolled users
        if (!isEnrolled) {
            quizzes.forEach(quiz => {
                quiz.questions = quiz.questions.map(q => ({
                    questionText: q.questionText,
                    options: q.options,
                    correctAnswer: -1,
                    explanation: undefined
                }));
            });
        }
        const responseData = { quizzes, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Quizzes retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve quizzes',
            errors: [error.message]
        };
    }
};
exports.getQuizzesByChapterService = getQuizzesByChapterService;
/**
 * Get quizzes by course
 */
const getCourseQuizzesService = async (courseId, cacheKey, isEnrolled) => {
    try {
        const quizzes = await quiz_model_1.default.find({ course: courseId })
            .populate('chapter', 'title order')
            .sort({ order: 1 })
            .lean();
        // SECURITY: Hide answers for non-enrolled users
        if (!isEnrolled) {
            quizzes.forEach(quiz => {
                quiz.questions = quiz.questions.map(q => ({
                    questionText: q.questionText,
                    options: q.options,
                    correctAnswer: -1,
                    explanation: undefined
                }));
            });
        }
        const responseData = { quizzes, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Course quizzes retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course quizzes',
            errors: [error.message]
        };
    }
};
exports.getCourseQuizzesService = getCourseQuizzesService;
/**
 * Submit quiz attempt
 */
const submitQuizAttemptService = async (userId, quizId, data) => {
    try {
        const result = await (0, withTransaction_1.withTransaction)(async (session) => {
            const quiz = await quiz_model_1.default.findById(quizId).session(session);
            if (!quiz)
                throw (0, errorHandler_2.createError)('Quiz not found', 404);
            // Check enrollment
            const enrollment = await enrollment_model_1.default.findOne({
                student: userId,
                course: quiz.course
            }).session(session);
            if (!enrollment)
                throw (0, errorHandler_2.createError)('Not enrolled in this course', 400);
            // Calculate score
            let score = 0;
            const results = quiz.questions.map((question, index) => {
                const userAnswer = data.answers[index] ?? -1;
                const isCorrect = question.correctAnswer === userAnswer;
                if (isCorrect)
                    score++;
                return {
                    question: question.questionText,
                    userAnswer,
                    correctAnswer: question.correctAnswer,
                    isCorrect,
                    explanation: question.explanation
                };
            });
            const percentage = (score / quiz.questions.length) * 100;
            const passed = percentage >= 70; // 70% passing score
            // Update course progress if passed
            if (passed) {
                let courseProgress = await progress_model_1.default.findOne({
                    user: userId,
                    course: quiz.course
                }).session(session);
                if (!courseProgress) {
                    courseProgress = new progress_model_1.default({
                        user: userId,
                        course: quiz.course,
                        completedLectures: new Map(),
                        completedQuizzes: new Map(),
                        totalLecturesCompleted: 0,
                        totalQuizzesCompleted: 0,
                        quizzesCompleted: false,
                        averageQuizScore: 0,
                        isCourseCompleted: false
                    });
                }
                // Track individual quiz completion
                const quizKey = quizId.toString();
                if (!courseProgress.completedQuizzes.get(quizKey)) {
                    courseProgress.completedQuizzes.set(quizKey, {
                        completed: true,
                        score: percentage,
                        completedAt: new Date()
                    });
                    courseProgress.totalQuizzesCompleted += 1;
                }
                // Check if all quizzes in the course are completed
                const totalQuizzes = await quiz_model_1.default.countDocuments({ course: quiz.course }).session(session);
                const allQuizzesCompleted = courseProgress.totalQuizzesCompleted >= totalQuizzes;
                courseProgress.quizzesCompleted = allQuizzesCompleted;
                // Calculate average quiz score from all completed quizzes
                const completedQuizScores = Array.from(courseProgress.completedQuizzes.values()).map(q => q.score);
                courseProgress.averageQuizScore = completedQuizScores.length > 0
                    ? completedQuizScores.reduce((sum, score) => sum + score, 0) / completedQuizScores.length
                    : 0;
                // Check if course is completed (both lectures AND quizzes)
                const totalLectures = await lecture_model_1.default.countDocuments({ course: quiz.course }).session(session);
                const allLecturesCompleted = courseProgress.totalLecturesCompleted >= totalLectures;
                if (allLecturesCompleted && allQuizzesCompleted && !courseProgress.isCourseCompleted) {
                    courseProgress.isCourseCompleted = true;
                    // Generate certificate when course is completed
                    await (0, progress_service_1.generateCertificate)(userId, quiz.course.toString());
                }
                await courseProgress.save({ session });
                // ✅ NEW: Invalidate caches when quiz is completed
                await (0, cache_1.invalidateCache)(`progress:dashboard:${userId}`);
                await (0, cache_1.invalidateCache)(`progress:courseId=${quiz.course}:${userId}`);
                await (0, cache_1.invalidateCache)(`enrolled-course-details:courseId=${quiz.course}:userId=${userId}`);
            }
            return {
                score: Math.round(percentage),
                passed,
                results,
                totalQuestions: quiz.questions.length,
                correctAnswers: score
            };
        });
        return {
            success: true,
            data: result,
            message: 'Quiz submitted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Quiz submission failed',
            errors: [error.message]
        };
    }
};
exports.submitQuizAttemptService = submitQuizAttemptService;
/**
 * Get quiz results for a course
 */
const getQuizResultsService = async (userId, courseId) => {
    try {
        const quizzes = await quiz_model_1.default.find({ course: courseId }).sort({ order: 1 });
        const courseProgress = await progress_model_1.default.findOne({ user: userId, course: courseId });
        const result = {
            totalQuizzes: quizzes.length,
            quizzesCompleted: courseProgress?.quizzesCompleted || false,
            averageScore: courseProgress?.averageQuizScore || 0,
            quizzes: quizzes.map(quiz => ({
                id: quiz._id,
                title: quiz.title,
                order: quiz.order,
                questionCount: quiz.questions.length
            }))
        };
        return {
            success: true,
            data: result,
            message: 'Quiz results retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve quiz results',
            errors: [error.message]
        };
    }
};
exports.getQuizResultsService = getQuizResultsService;
//# sourceMappingURL=quiz.service.js.map