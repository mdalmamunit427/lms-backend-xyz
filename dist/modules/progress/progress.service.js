"use strict";
// src/modules/progress/progress.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseCompletionStats = exports.generateCertificate = exports.getUserDashboard = exports.getCourseProgressService = exports.updateLectureProgress = void 0;
const errorHandler_1 = require("../../utils/errorHandler");
const cache_1 = require("../../utils/cache");
const progress_model_1 = __importDefault(require("./progress.model"));
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const course_model_1 = __importDefault(require("../courses/course.model"));
const enrollment_model_1 = __importDefault(require("../enrollments/enrollment.model"));
const certificate_model_1 = __importDefault(require("../certificates/certificate.model"));
const user_model_1 = __importDefault(require("../users/user.model"));
const quiz_model_1 = __importDefault(require("../quizes/quiz.model"));
const notification_service_1 = require("../notifications/notification.service");
const email_1 = require("../../utils/email");
const PROGRESS_CACHE_BASE = 'progress';
// Update lecture progress
const updateLectureProgress = async (userId, lectureId, progressPercentage) => {
    try {
        const lecture = await lecture_model_1.default.findById(lectureId);
        if (!lecture)
            throw (0, errorHandler_1.createError)('Lecture not found', 404);
        // Check if user is enrolled
        const enrollment = await enrollment_model_1.default.findOne({ student: userId, course: lecture.course });
        if (!enrollment)
            throw (0, errorHandler_1.createError)('Not enrolled in this course', 400);
        let courseProgress = await progress_model_1.default.findOne({ user: userId, course: lecture.course });
        if (!courseProgress) {
            courseProgress = new progress_model_1.default({
                user: userId,
                course: lecture.course,
                completedLectures: new Map(),
                totalLecturesCompleted: 0,
                quizzesCompleted: false,
                averageQuizScore: 0,
                isCourseCompleted: false
            });
        }
        // Mark as completed if 80% watched
        if (progressPercentage >= 0.8) {
            const lectureKey = lectureId.toString();
            if (!courseProgress.completedLectures.get(lectureKey)) {
                courseProgress.completedLectures.set(lectureKey, true);
                courseProgress.totalLecturesCompleted += 1;
                courseProgress.lastViewedLecture = lectureId;
            }
        }
        // Check if course is completed (both lectures AND quizzes)
        const totalLectures = await lecture_model_1.default.countDocuments({ course: lecture.course });
        const totalQuizzes = await quiz_model_1.default.countDocuments({ course: lecture.course });
        const allLecturesCompleted = courseProgress.totalLecturesCompleted >= totalLectures;
        const allQuizzesCompleted = courseProgress.totalQuizzesCompleted >= totalQuizzes;
        if (allLecturesCompleted && allQuizzesCompleted && !courseProgress.isCourseCompleted) {
            courseProgress.isCourseCompleted = true;
            // Generate certificate when course is completed
            await (0, exports.generateCertificate)(userId, lecture.course.toString());
        }
        await courseProgress.save();
        // Invalidate caches
        await (0, cache_1.invalidateCache)(`${PROGRESS_CACHE_BASE}:dashboard:${userId}`);
        await (0, cache_1.invalidateCache)(`${PROGRESS_CACHE_BASE}:courseId=${lecture.course}:${userId}`);
        await (0, cache_1.invalidateCache)(`progress-stats:courseId=${lecture.course}`);
        // ✅ NEW: Invalidate enrolled course details cache
        await (0, cache_1.invalidateCache)(`enrolled-course-details:courseId=${lecture.course}:userId=${userId}`);
        return {
            success: true,
            data: courseProgress,
            message: 'Lecture progress updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Lecture progress update failed',
            errors: [error.message]
        };
    }
};
exports.updateLectureProgress = updateLectureProgress;
// Get detailed course progress (with caching)
const getCourseProgressService = async (userId, courseId, cacheKey) => {
    try {
        let progress = await progress_model_1.default.findOne({ user: userId, course: courseId })
            .populate('course', 'title thumbnail')
            .populate('lastViewedLecture', 'title order');
        if (!progress) {
            return {
                success: false,
                message: 'No progress found for this course',
                errors: ['No progress record found for the specified course']
            };
        }
        // 🔧 AUTO-MIGRATION: Fix missing completedLectures data for existing records
        if (progress.totalLecturesCompleted > 0 && (!progress.completedLectures || progress.completedLectures.size === 0)) {
            console.log(`🔧 Auto-migrating lecture completion data for user ${userId}, course ${courseId}`);
            // Find all lectures in this course
            const courseLectures = await lecture_model_1.default.find({ course: courseId }).sort({ order: 1 });
            // Create completedLectures map
            if (!progress.completedLectures) {
                progress.completedLectures = new Map();
            }
            // Mark lectures as completed based on totalLecturesCompleted
            const lecturesToComplete = Math.min(progress.totalLecturesCompleted, courseLectures.length);
            for (let i = 0; i < lecturesToComplete; i++) {
                const lecture = courseLectures[i];
                if (lecture && lecture._id) {
                    progress.completedLectures.set(lecture._id.toString(), true);
                }
            }
            // Save the migrated data
            await progress.save();
            console.log(`✅ Auto-migration completed: ${lecturesToComplete} lectures marked as completed`);
        }
        // 🔧 AUTO-MIGRATION: Fix missing completedQuizzes data for existing records
        if (progress.totalQuizzesCompleted > 0 && (!progress.completedQuizzes || progress.completedQuizzes.size === 0)) {
            console.log(`🔧 Auto-migrating quiz completion data for user ${userId}, course ${courseId}`);
            // Find all quizzes in this course
            const courseQuizzes = await quiz_model_1.default.find({ course: courseId }).sort({ order: 1 });
            // Create completedQuizzes map
            if (!progress.completedQuizzes) {
                progress.completedQuizzes = new Map();
            }
            // Mark quizzes as completed based on totalQuizzesCompleted
            const quizzesToComplete = Math.min(progress.totalQuizzesCompleted, courseQuizzes.length);
            for (let i = 0; i < quizzesToComplete; i++) {
                const quiz = courseQuizzes[i];
                if (quiz && quiz._id) {
                    progress.completedQuizzes.set(quiz._id.toString(), {
                        completed: true,
                        score: progress.averageQuizScore || 100,
                        completedAt: progress.updatedAt || new Date()
                    });
                }
            }
            // Save the migrated data
            await progress.save();
            console.log(`✅ Auto-migration completed: ${quizzesToComplete} quizzes marked as completed`);
        }
        const totalLectures = await lecture_model_1.default.countDocuments({ course: courseId });
        const totalQuizzes = await quiz_model_1.default.countDocuments({ course: courseId });
        const totalItems = totalLectures + totalQuizzes;
        const completedItems = (progress.totalLecturesCompleted || 0) + (progress.totalQuizzesCompleted || 0);
        const completionPercentage = totalItems > 0
            ? (completedItems / totalItems) * 100
            : 0;
        const progressData = progress.toObject();
        // Convert Maps to plain objects for JSON serialization
        const completedLecturesObj = {};
        if (progress.completedLectures && progress.completedLectures.size > 0) {
            progress.completedLectures.forEach((value, key) => {
                completedLecturesObj[key] = value;
            });
        }
        const completedQuizzesObj = {};
        if (progress.completedQuizzes && progress.completedQuizzes.size > 0) {
            progress.completedQuizzes.forEach((value, key) => {
                completedQuizzesObj[key] = value;
            });
        }
        const responseData = {
            ...progressData,
            completedLectures: completedLecturesObj, // Override with proper object
            completedQuizzes: completedQuizzesObj, // Override with proper object
            completionPercentage: Math.round(completionPercentage),
            totalLectures,
            totalQuizzes,
            remainingLectures: totalLectures - progress.totalLecturesCompleted,
            remainingQuizzes: totalQuizzes - (progress.totalQuizzesCompleted || 0),
            cached: false
        };
        if (cacheKey) {
            await (0, cache_1.setCache)(cacheKey, responseData);
        }
        return {
            success: true,
            data: responseData,
            message: 'Course progress retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course progress',
            errors: [error.message]
        };
    }
};
exports.getCourseProgressService = getCourseProgressService;
// Get user's learning dashboard
const getUserDashboard = async (userId) => {
    try {
        const enrollments = await enrollment_model_1.default.find({ student: userId })
            .populate('course', 'title thumbnail category level averageRating');
        const progressData = await Promise.all(enrollments.map(async (enrollment) => {
            try {
                const progress = await (0, exports.getCourseProgressService)(userId, enrollment.course._id.toString());
                return {
                    course: enrollment.course,
                    progress: progress.data?.completionPercentage || 0,
                    isCompleted: progress.data?.isCourseCompleted || false,
                    lastViewed: progress.data?.lastViewedLecture || null
                };
            }
            catch (error) {
                return {
                    course: enrollment.course,
                    progress: 0,
                    isCompleted: false,
                    lastViewed: null
                };
            }
        }));
        const completedCourses = progressData.filter(p => p.isCompleted).length;
        const inProgressCourses = progressData.filter(p => !p.isCompleted).length;
        const result = {
            totalEnrollments: enrollments.length,
            completedCourses,
            inProgressCourses,
            courses: progressData
        };
        return {
            success: true,
            data: result,
            message: 'Dashboard retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve dashboard',
            errors: [error.message]
        };
    }
};
exports.getUserDashboard = getUserDashboard;
// Generate certificate when course is completed
const generateCertificate = async (userId, courseId) => {
    try {
        const course = await course_model_1.default.findById(courseId);
        const user = await user_model_1.default.findById(userId);
        if (!course || !user) {
            return {
                success: false,
                message: 'Course or user not found',
                errors: ['Invalid course or user ID']
            };
        }
        // Check if certificate already exists
        const existingCertificate = await certificate_model_1.default.findOne({ user: userId, course: courseId });
        if (existingCertificate) {
            // If a certificate exists, resend email/notification to ensure the user is informed
            try {
                await (0, email_1.sendEmail)(user.email, `🏆 Certificate Earned - CodeTutor LMS`, 'certificate-completion', {
                    studentName: user.name,
                    courseTitle: course.title,
                    completionDate: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    certificateId: existingCertificate.certificateId,
                    certificateUrl: existingCertificate.downloadUrl
                });
            }
            catch (error) {
                console.error('Failed to send existing certificate email:', error);
            }
            // Send in-app notification as well
            await (0, notification_service_1.createNotification)(userId, 'certificate_earned', `Congratulations! You've earned a certificate for completing ${course.title}`, courseId);
            return {
                success: true,
                data: existingCertificate,
                message: 'Certificate already exists. Email and notification sent.'
            };
        }
        // Generate unique certificate ID
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Create certificate
        const certificate = new certificate_model_1.default({
            user: userId,
            course: courseId,
            certificateId,
            downloadUrl: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/certificates/download/${certificateId}`
        });
        await certificate.save();
        // Send email notification
        try {
            await (0, email_1.sendEmail)(user.email, `🏆 Certificate Earned - CodeTutor LMS`, 'certificate-completion', {
                studentName: user.name,
                courseTitle: course.title,
                completionDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                certificateId: certificateId,
                certificateUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/certificates/download/${certificateId}`
            });
        }
        catch (error) {
            console.error('Failed to send certificate completion email:', error);
        }
        // Send in-app notification
        await (0, notification_service_1.createNotification)(userId, 'certificate_earned', `Congratulations! You've earned a certificate for completing ${course.title}`, courseId);
        return {
            success: true,
            data: certificate,
            message: 'Certificate generated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Certificate generation failed',
            errors: [error.message]
        };
    }
};
exports.generateCertificate = generateCertificate;
// Get course completion statistics
const getCourseCompletionStats = async (courseId) => {
    try {
        const totalEnrollments = await enrollment_model_1.default.countDocuments({ course: courseId });
        const completedProgress = await progress_model_1.default.countDocuments({
            course: courseId,
            isCourseCompleted: true
        });
        const completionRate = totalEnrollments > 0
            ? (completedProgress / totalEnrollments) * 100
            : 0;
        const result = {
            totalEnrollments,
            completedCourses: completedProgress,
            completionRate: Math.round(completionRate)
        };
        return {
            success: true,
            data: result,
            message: 'Course completion stats retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course completion stats',
            errors: [error.message]
        };
    }
};
exports.getCourseCompletionStats = getCourseCompletionStats;
//# sourceMappingURL=progress.service.js.map