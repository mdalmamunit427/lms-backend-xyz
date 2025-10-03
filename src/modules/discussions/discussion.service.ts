// src/modules/discussions/discussion.service.ts

import mongoose, { Types } from 'mongoose';
import { AppError } from "../../utils/errorHandler";
import { createError } from "../../utils/errorHandler";
import { withTransaction } from "../../utils/withTransaction";
import { invalidateCache, setCache } from "../../utils/cache";
import Discussion, { IDiscussion } from "./discussion.model";
import Lecture from "../lectures/lecture.model";
import Course from "../courses/course.model";
import { createNotification } from "../notifications/notification.service";
import { ServiceResponse } from "../../@types/api";

const DISCUSSION_CACHE_BASE = 'discussions';

// --- CORE SERVICE FUNCTIONS ---

/**
 * Create discussion
 */
export const createDiscussionService = async (
  userId: string, 
  lectureId: string, 
  question: string
): Promise<ServiceResponse<IDiscussion>> => {
    try {
        const discussion = await withTransaction(async (session) => {
            const lecture = await Lecture.findById(lectureId).session(session);
            if (!lecture) throw createError('Lecture not found', 404);
            
            const [discussion] = await Discussion.create([{
                user: userId,
                lecture: lectureId,
                course: lecture.course,
                question,
                answers: []
            }], { session, ordered: true });

            if (!discussion) throw createError("Failed to create discussion.", 500);
            
            // Notify instructor
            const course = await Course.findById(lecture.course).session(session);
            if (course) {
                await createNotification(
                    course.instructor.toString(),
                    'new_question',
                    `New question in ${lecture.title}`,
                    (discussion._id as Types.ObjectId).toString()
                );
            }
            
            // Invalidate caches (matching the cache key patterns from routes)
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:id=${discussion._id}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${lectureId}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${lecture.course}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
            
            return discussion.populate('user', 'name avatar');
        });

        return {
            success: true,
            data: discussion,
            message: 'Discussion created successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Discussion creation failed',
            errors: [error.message]
        };
    }
};

/**
 * Answer question
 */
export const answerQuestionService = async (
  discussionId: string, 
  userId: string, 
  text: string, 
  isInstructor: boolean = false
): Promise<ServiceResponse<IDiscussion>> => {
    try {
        const discussion = await withTransaction(async (session) => {
            const discussion = await Discussion.findById(discussionId).session(session);
            if (!discussion) throw createError('Discussion not found', 404);
            
            discussion.answers.push({
                user: userId as any,
                text,
                isInstructorAnswer: isInstructor
            } as any);
            
            await discussion.save({ session });
            
            // Notify question asker if different from answerer
            if (discussion.user.toString() !== userId) {
                await createNotification(
                    discussion.user.toString(),
                    'question_answered',
                    `Your question has been answered`,
                    discussionId
                );
            }
            
            // Invalidate caches (batch, non-blocking)
            Promise.all([
                invalidateCache(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`),
                invalidateCache(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`),
                invalidateCache(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`),
                invalidateCache(`${DISCUSSION_CACHE_BASE}:user:user=${discussion.user}`),
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
    } catch (error: any) {
        return {
            success: false,
            message: 'Answer submission failed',
            errors: [error.message]
        };
    }
};

/**
 * Update discussion
 */
export const updateDiscussionService = async (
  discussionId: string, 
  userId: string, 
  question: string
): Promise<ServiceResponse<IDiscussion>> => {
    try {
        const discussion = await withTransaction(async (session) => {
            const discussion = await Discussion.findOne({ 
                _id: discussionId, 
                user: userId 
            }).session(session);
            
            if (!discussion) throw createError('Discussion not found or unauthorized', 404);
            
            discussion.question = question;
            await discussion.save({ session });
            
            // Invalidate caches (matching the cache key patterns from routes)
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
            
            return discussion.populate('user', 'name avatar');
        });

        return {
            success: true,
            data: discussion,
            message: 'Discussion updated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Discussion update failed',
            errors: [error.message]
        };
    }
};

/**
 * Delete discussion
 */
export const deleteDiscussionService = async (
  discussionId: string, 
  userId: string
): Promise<ServiceResponse<any>> => {
    try {
        await withTransaction(async (session) => {
            const discussion = await Discussion.findOneAndDelete({ 
                _id: discussionId, 
                user: userId 
            }, { session });
            
            if (!discussion) throw createError('Discussion not found or unauthorized', 404);
            
            // Invalidate caches (matching the cache key patterns from routes)
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:id=${discussionId}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:lectureId:lectureId=${discussion.lecture}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:courseId:courseId=${discussion.course}`);
            await invalidateCache(`${DISCUSSION_CACHE_BASE}:user:user=${userId}`);
        });

        return {
            success: true,
            data: undefined,
            message: 'Discussion deleted successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Discussion deletion failed',
            errors: [error.message]
        };
    }
};

/**
 * Get discussion by ID with caching
 */
export const getDiscussionByIdService = async (id: string, cacheKey: string): Promise<ServiceResponse<any>> => {
    try {
        const discussion = await Discussion.findById(id)
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
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Discussion retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve discussion',
            errors: [error.message]
        };
    }
};

/**
 * Get lecture discussions with caching
 */
export const getLectureDiscussionsService = async (
  lectureId: string, 
  options: any = {}, 
  cacheKey: string
): Promise<ServiceResponse<any>> => {
    try {
        const { page = 1, limit = 20, hasAnswers } = options;
        const skip = (page - 1) * limit;
        
        const query: any = { lecture: lectureId };
        if (hasAnswers !== undefined) {
            query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
        }

        const discussions = await Discussion.find(query)
            .populate('user', 'name avatar')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Discussion.countDocuments(query);
        
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
        
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Lecture discussions retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve lecture discussions',
            errors: [error.message]
        };
    }
};

/**
 * Get course discussions with caching
 */
export const getCourseDiscussionsService = async (
  courseId: string, 
  options: any = {}, 
  cacheKey: string
): Promise<ServiceResponse<any>> => {
    try {
        const { page = 1, limit = 50, hasAnswers } = options;
        const skip = (page - 1) * limit;
        
        const query: any = { course: courseId };
        if (hasAnswers !== undefined) {
            query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
        }

        const discussions = await Discussion.find(query)
            .populate('user', 'name avatar')
            .populate('lecture', 'title order')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Discussion.countDocuments(query);
        
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
        
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Course discussions retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve course discussions',
            errors: [error.message]
        };
    }
};

/**
 * Get user discussions with caching
 */
export const getUserDiscussionsService = async (
  userId: string, 
  options: any = {}, 
  cacheKey: string
): Promise<ServiceResponse<any>> => {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const discussions = await Discussion.find({ user: userId })
            .populate('lecture', 'title order')
            .populate('course', 'title thumbnail')
            .populate('answers.user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Discussion.countDocuments({ user: userId });
        
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
        
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'User discussions retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve user discussions',
            errors: [error.message]
        };
    }
};

// Legacy functions for backward compatibility
export const createDiscussion = createDiscussionService;
export const answerQuestion = answerQuestionService;
export const getLectureDiscussions = (lectureId: string) => 
  Discussion.find({ lecture: lectureId })
    .populate('user', 'name avatar')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });

export const getCourseDiscussions = (courseId: string) =>
  Discussion.find({ course: courseId })
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });

export const getDiscussionById = (discussionId: string) =>
  Discussion.findById(discussionId)
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar');

export const updateDiscussion = updateDiscussionService;
export const deleteDiscussion = deleteDiscussionService;

export const getUserDiscussions = (userId: string) =>
  Discussion.find({ user: userId })
    .populate('lecture', 'title order')
    .populate('course', 'title')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 });