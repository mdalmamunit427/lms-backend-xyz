// src/modules/progress/progress.service.ts

import { Types } from 'mongoose';
import { AppError } from "../../utils/errorHandler";
import { createError } from "../../utils/errorHandler";
import { withTransaction } from "../../utils/withTransaction";
import { invalidateCache, setCache } from "../../utils/cache";
import CourseProgress from "./progress.model";
import Lecture from "../lectures/lecture.model";
import Course from "../courses/course.model";
import Enrollment from "../enrollments/enrollment.model";
import Certificate from "../certificates/certificate.model";
import User from "../users/user.model";
import Quiz from "../quizes/quiz.model";
import { createNotification } from "../notifications/notification.service";
import { sendEmail } from "../../utils/email";
import { ServiceResponse } from "../../@types/api";

const PROGRESS_CACHE_BASE = 'progress';

// Update lecture progress
export const updateLectureProgress = async (userId: string, lectureId: string, progressPercentage: number): Promise<ServiceResponse<any>> => {
    try {
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) throw createError('Lecture not found', 404);
        
        // Check if user is enrolled
        const enrollment = await Enrollment.findOne({ student: userId, course: lecture.course });
        if (!enrollment) throw createError('Not enrolled in this course', 400);
        
        let courseProgress = await CourseProgress.findOne({ user: userId, course: lecture.course });
        
        if (!courseProgress) {
            courseProgress = new CourseProgress({
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
                courseProgress.lastViewedLecture = lectureId as any;
            }
        }
        
        // Check if course is completed (both lectures AND quizzes)
        const totalLectures = await Lecture.countDocuments({ course: lecture.course });
        const totalQuizzes = await Quiz.countDocuments({ course: lecture.course });
        
        const allLecturesCompleted = courseProgress.totalLecturesCompleted >= totalLectures;
        const allQuizzesCompleted = courseProgress.totalQuizzesCompleted >= totalQuizzes;
        
        if (allLecturesCompleted && allQuizzesCompleted && !courseProgress.isCourseCompleted) {
            courseProgress.isCourseCompleted = true;
            // Generate certificate when course is completed
            await generateCertificate(userId, lecture.course.toString());
        }
        
        await courseProgress.save();
        
        // Invalidate caches
        await invalidateCache(`${PROGRESS_CACHE_BASE}:dashboard:${userId}`);
        await invalidateCache(`${PROGRESS_CACHE_BASE}:courseId=${lecture.course}:${userId}`);
        await invalidateCache(`progress-stats:courseId=${lecture.course}`);
        
        // ✅ NEW: Invalidate enrolled course details cache
        await invalidateCache(`enrolled-course-details:courseId=${lecture.course}:userId=${userId}`);
        
        return {
            success: true,
            data: courseProgress,
            message: 'Lecture progress updated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Lecture progress update failed',
            errors: [error.message]
        };
    }
};

// Get detailed course progress (with caching)
export const getCourseProgressService = async (userId: string, courseId: string, cacheKey?: string): Promise<ServiceResponse<any>> => {
    try {
        let progress = await CourseProgress.findOne({ user: userId, course: courseId })
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
            const courseLectures = await Lecture.find({ course: courseId }).sort({ order: 1 });
            
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
            const courseQuizzes = await Quiz.find({ course: courseId }).sort({ order: 1 });
            
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
        
        const totalLectures = await Lecture.countDocuments({ course: courseId });
        const totalQuizzes = await Quiz.countDocuments({ course: courseId });
        const totalItems = totalLectures + totalQuizzes;
        const completedItems = (progress.totalLecturesCompleted || 0) + (progress.totalQuizzesCompleted || 0);
        const completionPercentage = totalItems > 0
            ? (completedItems / totalItems) * 100
            : 0;
        
        const progressData = progress.toObject();
        
        // Convert Maps to plain objects for JSON serialization
        const completedLecturesObj: { [key: string]: boolean } = {};
        if (progress.completedLectures && progress.completedLectures.size > 0) {
            progress.completedLectures.forEach((value, key) => {
                completedLecturesObj[key] = value;
            });
        }
        
        const completedQuizzesObj: { [key: string]: { completed: boolean; score: number; completedAt: Date } } = {};
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
            await setCache(cacheKey, responseData);
        }
        
        return {
            success: true,
            data: responseData,
            message: 'Course progress retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve course progress',
            errors: [error.message]
        };
    }
};


// Get user's learning dashboard
export const getUserDashboard = async (userId: string): Promise<ServiceResponse<any>> => {
    try {
        const enrollments = await Enrollment.find({ student: userId })
            .populate('course', 'title thumbnail category level averageRating');
        
        const progressData = await Promise.all(
            enrollments.map(async (enrollment) => {
                try {
                    const progress = await getCourseProgressService(userId, enrollment.course._id.toString());
                    return {
                        course: enrollment.course,
                        progress: progress.data?.completionPercentage || 0,
                        isCompleted: progress.data?.isCourseCompleted || false,
                        lastViewed: progress.data?.lastViewedLecture || null
                    };
                } catch (error) {
                    return {
                        course: enrollment.course,
                        progress: 0,
                        isCompleted: false,
                        lastViewed: null
                    };
                }
            })
        );
        
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
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve dashboard',
            errors: [error.message]
        };
    }
};

// Generate certificate when course is completed
export const generateCertificate = async (userId: string, courseId: string): Promise<ServiceResponse<any>> => {
    try {
        const course = await Course.findById(courseId);
        const user = await User.findById(userId);
        
        if (!course || !user) {
            return {
                success: false,
                message: 'Course or user not found',
                errors: ['Invalid course or user ID']
            };
        }
        
        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({ user: userId, course: courseId });
        if (existingCertificate) {
            // If a certificate exists, resend email/notification to ensure the user is informed
            try {
                await sendEmail(
                    user.email,
                    `🏆 Certificate Earned - CodeTutor LMS`,
                    'certificate-completion',
                    {
                        studentName: user.name,
                        courseTitle: course.title,
                        completionDate: new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        certificateId: existingCertificate.certificateId,
                        certificateUrl: existingCertificate.downloadUrl
                    }
                );
            } catch (error) {
                console.error('Failed to send existing certificate email:', error);
            }

            // Send in-app notification as well
            await createNotification(
                userId,
                'certificate_earned',
                `Congratulations! You've earned a certificate for completing ${course.title}`,
                courseId
            );

            return {
                success: true,
                data: existingCertificate,
                message: 'Certificate already exists. Email and notification sent.'
            };
        }
        
        // Generate unique certificate ID
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create certificate
        const certificate = new Certificate({
            user: userId,
            course: courseId,
            certificateId,
            downloadUrl: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/certificates/download/${certificateId}`
        });
        
        await certificate.save();
        
        // Send email notification
        try {
            await sendEmail(
                user.email,
                `🏆 Certificate Earned - CodeTutor LMS`,
                'certificate-completion',
                {
                    studentName: user.name,
                    courseTitle: course.title,
                    completionDate: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    certificateId: certificateId,
                    certificateUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/certificates/download/${certificateId}`
                }
            );
        } catch (error) {
            console.error('Failed to send certificate completion email:', error);
        }
        
        // Send in-app notification
        await createNotification(
            userId,
            'certificate_earned',
            `Congratulations! You've earned a certificate for completing ${course.title}`,
            courseId
        );
        
        return {
            success: true,
            data: certificate,
            message: 'Certificate generated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Certificate generation failed',
            errors: [error.message]
        };
    }
};

// Get course completion statistics
export const getCourseCompletionStats = async (courseId: string): Promise<ServiceResponse<any>> => {
    try {
        const totalEnrollments = await Enrollment.countDocuments({ course: courseId });
        const completedProgress = await CourseProgress.countDocuments({ 
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
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve course completion stats',
            errors: [error.message]
        };
    }
};

