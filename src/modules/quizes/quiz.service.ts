// src/modules/quizes/quiz.service.ts

import mongoose, { Types } from 'mongoose';
import { AppError } from "../../utils/errorHandler";
import { createError } from "../../utils/errorHandler";
import { withTransaction } from "../../utils/withTransaction";
import { invalidateCache, setCache } from "../../utils/cache";
import { validateCourseAndOwnership, UserRole } from "../../utils/ownership";
import { 
    reorderChapterItemsWithConflictResolution, 
    getNextAvailableOrder,
    validateChapterBelongsToCourse,
    updateChapterContentArray 
} from "../../utils/chapterReorder";
import Quiz, { IQuiz } from "./quiz.model";
import Chapter from "../chapters/chapter.model";
import CourseProgress from "../progress/progress.model";
import Enrollment from "../enrollments/enrollment.model";
import Lecture from "../lectures/lecture.model";
import { ICreateQuizBody, IUpdateQuizBody, ISubmitQuizAttemptBody } from "./quiz.validation";
import { ServiceResponse } from "../../@types/api";

import { generateCertificate } from "../progress/progress.service";

const QUIZ_CACHE_BASE = 'quizzes';

// --- CORE SERVICE FUNCTIONS ---

/**
 * Create a new quiz with smart order conflict resolution
 */
export const createQuizService = async (data: ICreateQuizBody, userId: string, userRole: UserRole): Promise<ServiceResponse<IQuiz>> => {
    try {
        const quiz = await withTransaction(async (session) => {
            let courseId: string;
            let chapterId: string;
            let lectureId: string | undefined;

            // 1. DETERMINE FORMAT: Lecture-based or Course/Chapter-based
            if (data.lecture) {
                // Lecture-based format (new format)
                const lecture = await Lecture.findById(data.lecture).session(session);
                if (!lecture) {
                    throw new AppError("Lecture not found", 404);
                }
                courseId = lecture.course.toString();
                chapterId = lecture.chapter.toString();
                lectureId = data.lecture;
            } else if (data.course && data.chapter) {
                // Course/Chapter-based format (old format)
                courseId = data.course;
                chapterId = data.chapter;
                lectureId = undefined;
            } else {
                throw new AppError("Either lecture ID or both course and chapter IDs must be provided", 400);
            }

            // 2. SECURITY: Enforce course ownership
            await validateCourseAndOwnership(courseId, userId, userRole);

            // 3. Validate chapter belongs to course
            const chapter = await validateChapterBelongsToCourse(chapterId, courseId, session);

            // 4. Auto-calculate order if not provided
            const targetOrder = data.order || await getNextAvailableOrder(chapterId, session);

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
            const [quiz] = await Quiz.create([quizData], { session, ordered: true });
            if (!quiz) throw new AppError("Failed to create quiz.", 500);

            // 7. Apply smart reorder logic if order was specified
            if (data.order) {
              await reorderChapterItemsWithConflictResolution(
                chapterId,
                [{ itemId: (quiz._id as any).toString(), itemType: 'quiz', order: data.order }],
                session
              );
            } else {
              // For auto-calculated order, just update chapter content normally
              await updateChapterContentArray(chapterId, session);
            }

            // 8. Invalidate caches
            await invalidateCache(`${QUIZ_CACHE_BASE}:${quiz._id}`);
            await invalidateCache(`chapter:${chapter._id}`);
            await invalidateCache(`course:id=${courseId}`);

            return quiz;
        });

        return {
            success: true,
            data: quiz,
            message: 'Quiz created successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Quiz creation failed',
            errors: [error.message]
        };
    }
};

/**
 * Update quiz with smart order conflict resolution
 */
export const updateQuizService = async (id: string, data: IUpdateQuizBody, userId: string, userRole: UserRole): Promise<ServiceResponse<IQuiz>> => {
    try {
        const quiz = await withTransaction(async (session) => {
            const quiz = await Quiz.findById(id).session(session);
            if (!quiz) throw new AppError("Quiz not found", 404);

            // 1. SECURITY: Enforce ownership
            await validateCourseAndOwnership(quiz.course.toString(), userId, userRole);

            // 2. Check if order is being changed
            const isOrderChange = data.order !== undefined && data.order !== quiz.order;
            
            if (isOrderChange) {
              // Apply smart reorder logic when order is being changed
              await reorderChapterItemsWithConflictResolution(
                quiz.chapter.toString(),
                [{ itemId: id, itemType: 'quiz', order: data.order! }],
                session
              );
              
              // Remove order from data since it's already handled by reorder logic
              const { order, ...otherData } = data;
              Object.assign(quiz, otherData);
            } else {
              // Normal update for non-order fields
              Object.assign(quiz, data);
            }

            await quiz.save({ session });

            // 3. Update chapter content if title changed
            if (data.title) {
              await Chapter.updateOne(
                { "content.refId": quiz._id },
                { $set: { "content.$.title": data.title } },
                { session }
              );
            }

            // 4. Invalidate caches (batch, non-blocking)
            Promise.all([
              invalidateCache(`${QUIZ_CACHE_BASE}:${quiz._id}`),
              invalidateCache(`chapter:${quiz.chapter}`),
            ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            await invalidateCache(`course:id=${quiz.course}`);

            return quiz;
        });

        return {
            success: true,
            data: quiz,
            message: 'Quiz updated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Quiz update failed',
            errors: [error.message]
        };
    }
};

/**
 * Delete quiz
 */
export const deleteQuizService = async (id: string, userId: string, userRole: UserRole): Promise<ServiceResponse<IQuiz>> => {
    try {
        const deletedQuiz = await withTransaction(async (session) => {
            const quiz = await Quiz.findById(id).session(session);
            if (!quiz) throw new AppError("Quiz not found", 404);

            // 1. SECURITY: Enforce ownership
            await validateCourseAndOwnership(quiz.course.toString(), userId, userRole);

            // 2. Remove from chapter content
            await Chapter.updateOne(
              { "content.refId": quiz._id },
              { $pull: { content: { refId: quiz._id } } },
              { session }
            );

            // 3. Delete quiz
            const deletedQuiz = await Quiz.findByIdAndDelete(id, { session});

            // 4. Invalidate caches
            if (deletedQuiz) {
              await invalidateCache(`${QUIZ_CACHE_BASE}:${id}`);
              await invalidateCache(`chapter:${deletedQuiz.chapter}`);
              await invalidateCache(`course:id=${deletedQuiz.course}`);
            }

            return deletedQuiz;
        });

        return {
            success: true,
            data: deletedQuiz!,
            message: 'Quiz deleted successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Quiz deletion failed',
            errors: [error.message]
        };
    }
};

/**
 * Get quiz by ID with security filtering
 */
export const getQuizByIdService = async (id: string, cacheKey: string, userId: string, userRole: string): Promise<ServiceResponse<any>> => {
    try {
        const quiz = await Quiz.findById(id)
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

        // Check enrollment status
        let isEnrolled = false;
        if (userRole === 'admin' || userRole === 'instructor') {
            isEnrolled = true;
        } else if (userRole === 'student') {
            const enrollment = await Enrollment.findOne({ 
                student: userId, 
                course: quiz.course 
            });
            isEnrolled = !!enrollment;
        }

        // SECURITY: Block complete access if not enrolled
        if (!isEnrolled) {
            return {
                success: false,
                message: 'Access denied',
                errors: ['You must be enrolled in this course to access quiz content']
            };
        }

        const responseData = { quiz, cached: false };
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Quiz retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve quiz',
            errors: [error.message]
        };
    }
};


/**
 * Submit quiz attempt
 */
export const submitQuizAttemptService = async (userId: string, quizId: string, data: ISubmitQuizAttemptBody): Promise<ServiceResponse<any>> => {
    try {
        const result = await withTransaction(async (session) => {
            const quiz = await Quiz.findById(quizId).session(session);
            if (!quiz) throw createError('Quiz not found', 404);

            // Check enrollment
            const enrollment = await Enrollment.findOne({ 
              student: userId, 
              course: quiz.course 
            }).session(session);
            if (!enrollment) throw createError('Not enrolled in this course', 400);

            // Calculate score
            let score = 0;
            const results = quiz.questions.map((question, index) => {
              const userAnswer = data.answers[index] ?? -1;
              const isCorrect = question.correctAnswer === userAnswer;
              if (isCorrect) score++;

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
              let courseProgress = await CourseProgress.findOne({ 
                user: userId, 
                course: quiz.course 
              }).session(session);

              if (!courseProgress) {
                courseProgress = new CourseProgress({
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
              const totalQuizzes = await Quiz.countDocuments({ course: quiz.course }).session(session);
              const allQuizzesCompleted = courseProgress.totalQuizzesCompleted >= totalQuizzes;
              courseProgress.quizzesCompleted = allQuizzesCompleted;

              // Calculate average quiz score from all completed quizzes
              const completedQuizScores = Array.from(courseProgress.completedQuizzes.values()).map(q => q.score);
              courseProgress.averageQuizScore = completedQuizScores.length > 0 
                ? completedQuizScores.reduce((sum, score) => sum + score, 0) / completedQuizScores.length 
                : 0;

              // Check if course is completed (both lectures AND quizzes)
              const totalLectures = await Lecture.countDocuments({ course: quiz.course }).session(session);
              const allLecturesCompleted = courseProgress.totalLecturesCompleted >= totalLectures;
              
              if (allLecturesCompleted && allQuizzesCompleted && !courseProgress.isCourseCompleted) {
                courseProgress.isCourseCompleted = true;
                // Generate certificate when course is completed
                await generateCertificate(userId, quiz.course.toString());
              }

              await courseProgress.save({ session });
              
              // ✅ NEW: Invalidate caches when quiz is completed
              await invalidateCache(`progress:dashboard:${userId}`);
              await invalidateCache(`progress:courseId=${quiz.course}:${userId}`);
              await invalidateCache(`enrolled-course-details:courseId=${quiz.course}:userId=${userId}`);
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
    } catch (error: any) {
        return {
            success: false,
            message: 'Quiz submission failed',
            errors: [error.message]
        };
    }
};

/**
 * Get quiz results for a course
 */
export const getQuizResultsService = async (userId: string, courseId: string): Promise<ServiceResponse<any>> => {
    try {
        // Check if user is enrolled in the course
        const enrollment = await Enrollment.findOne({ 
            student: userId, 
            course: courseId 
        });
        
        if (!enrollment) {
            return {
                success: false,
                message: 'Not enrolled in this course',
                errors: ['You must be enrolled in the course to view quiz results']
            };
        }

        const quizzes = await Quiz.find({ course: courseId }).sort({ order: 1 });
        const courseProgress = await CourseProgress.findOne({ user: userId, course: courseId });

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
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve quiz results',
            errors: [error.message]
        };
    }
};