// src/modules/lectures/lecture.service.ts

import mongoose, { Schema } from 'mongoose';
import Lecture, { ILecture } from './lecture.model';
import Chapter from '../chapters/chapter.model'; // Assuming Chapter model exists
import { ICreateLectureBody, IUpdateLectureBody } from './lecture.validation';
import { setCache, invalidateCache } from '../../utils/cache'; 
import { withTransaction } from '../../utils/withTransaction';
import { AppError } from '../../utils/errorHandler';
import { createError } from '../../utils/errorHandler';
// Importing the shared security helper
import { UserRole, validateCourseAndOwnership } from '../../utils/ownership';
import { 
    reorderChapterItemsWithConflictResolution, 
    getNextAvailableOrder,
    validateChapterBelongsToCourse 
} from "../../utils/chapterReorder";
import { ServiceResponse } from "../../@types/api"; 

const LECTURE_CACHE_BASE = 'lectures';


// --- CORE SERVICE FUNCTIONS ---

/**
 * Creates a new lecture with smart conflict resolution for order, and atomically links it to the parent chapter.
 */
export const createLectureService = async (data: ICreateLectureBody, userId: string, userRole: UserRole): Promise<ServiceResponse<ILecture>> => {
    try {
        const lecture = await withTransaction(async (session) => {
            
            // 1. SECURITY: Enforce course ownership (Uses shared utility)
            await validateCourseAndOwnership(data.course, userId, userRole, session);

            // 2. FETCH and VALIDATE CHAPTER
            const chapter = await Chapter.findById(data.chapter).session(session);
            // Ensure chapter exists AND belongs to the course ID provided
            if (!chapter || chapter.course.toString() !== data.course) {
                 throw createError("Chapter not found or does not belong to the specified course.", 404);
            }
            
            let lecture: ILecture;
            
            if (data.order !== undefined) {
                // Use smart conflict resolution for specified order
                // Create lecture with temporary high order first (since order field is required)
                const tempOrder = (await Lecture.countDocuments({ chapter: data.chapter }).session(session)) + 1000;
                const createdLectures = await Lecture.create([{ ...data, order: tempOrder }], { session, ordered: true });
                
                if (createdLectures.length === 0 || !createdLectures[0]) {
                    throw createError("Failed to create lecture.", 500);
                }
                
                lecture = createdLectures[0];
                
                // Apply smart reorder logic to place the lecture at the desired position
                await reorderChapterItemsWithConflictResolution(
                    data.chapter,
                    [{ itemId: (lecture._id as any).toString(), itemType: 'lecture', order: data.order }],
                    session
                );
            } else {
                // Auto-calculate order (existing behavior)
                const order = (await Lecture.countDocuments({ chapter: data.chapter }).session(session)) + 1;
                const createdLectures = await Lecture.create([{ ...data, order }], { session, ordered: true });
                
                if (createdLectures.length === 0 || !createdLectures[0]) {
                    throw createError("Failed to create lecture.", 500);
                }
                
                lecture = createdLectures[0];
            }

            // 5. Link the lecture to the parent chapter (Transactional write)
            chapter.content.push({
              type: 'lecture',
              refId: lecture._id as any,
              title: lecture.title,
              isPreview: lecture.isPreview || false
            });
            await chapter.save({ session });
            
            // 6. Invalidate relevant caches (batch fire-and-forget)
            Promise.all([
                invalidateCache(`${LECTURE_CACHE_BASE}:${lecture._id}`),
                invalidateCache(`${LECTURE_CACHE_BASE}:chapterId=${chapter._id}*`),
                invalidateCache(`chapter:${chapter._id}`),
                invalidateCache(`course:id=${data.course}`),
            ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));

            return lecture;
        });

        return {
            success: true,
            data: lecture,
            message: 'Lecture created successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Lecture creation failed',
            errors: [error.message]
        };
    }
};

/**
 * Gets a single lecture by ID.
 * Implements security: Hides videoUrl if the user is not enrolled or is not the instructor/admin.
 */
export const getLectureByIdService = async (id: string, cacheKey: string, isEnrolled: boolean): Promise<ServiceResponse<ILecture>> => {
    try {
        const lecture = await Lecture.findById(id).lean();

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
        
        await setCache(cacheKey, { lecture, cached: false });
        
        return {
            success: true,
            data: lecture,
            message: 'Lecture retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve lecture',
            errors: [error.message]
        };
    }
};

/**
 * Gets all lectures for a chapter.
 * Implements security: Hides videoUrl for non-preview content.
 */
export const getLecturesByChapterService = async (chapterId: string, cacheKey: string, isEnrolled: boolean): Promise<ServiceResponse<{lectures: ILecture[]}>> => {
    try {
        const lectures = await Lecture.find({ chapter: chapterId }).sort({ order: 1 }).lean();
        
        // SECURITY: Hide videoUrl for non-preview content
        lectures.forEach(lec => {
            if (!lec.isPreview && !isEnrolled) {
                lec.videoUrl = '';
            }
        });

        const responseData = { lectures, cached: false };
        await setCache(cacheKey, responseData);
        
        return {
            success: true,
            data: responseData,
            message: 'Lectures retrieved successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to retrieve lectures',
            errors: [error.message]
        };
    }
};

/**
 * Updates a lecture with smart order conflict resolution.
 */
export const updateLectureService = async (id: string, data: IUpdateLectureBody, userId: string, userRole: UserRole): Promise<ServiceResponse<ILecture>> => {
    try {
        const lecture = await withTransaction(async (session) => {
            const lecture = await Lecture.findById(id).session(session);
            if (!lecture) throw createError("Lecture not found", 404);

            // 1. SECURITY: Enforce ownership
            await validateCourseAndOwnership(lecture.course.toString(), userId, userRole, session);

            // 2. Check if order is being changed
            const isOrderChange = data.order !== undefined && data.order !== lecture.order;
            
            if (isOrderChange) {
                // Apply smart reorder logic when order is being changed
                await reorderChapterItemsWithConflictResolution(
                    lecture.chapter.toString(), 
                    [{ itemId: id, itemType: 'lecture', order: data.order! }], 
                    session
                );
                
                // Remove order from data since it's already handled by reorder logic
                const { order, ...otherData } = data;
                Object.assign(lecture, otherData);
            } else {
                // Normal update for non-order fields
                Object.assign(lecture, data);
            }
            
            await lecture.save({ session });
            
            // 3. Invalidate caches (batch fire-and-forget)
            Promise.all([
                invalidateCache(`${LECTURE_CACHE_BASE}:${lecture._id}`),
                invalidateCache(`${LECTURE_CACHE_BASE}:chapterId=${lecture.chapter}*`),
                invalidateCache(`chapter:${lecture.chapter}`),
                invalidateCache(`course:id=${lecture.course}`),
            ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));
            
            return lecture;
        });

        return {
            success: true,
            data: lecture,
            message: 'Lecture updated successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Lecture update failed',
            errors: [error.message]
        };
    }
};


/**
 * Deletes a lecture and unlinks it from the parent chapter (Transactional Cascading Delete).
 */
export const deleteLectureService = async (id: string, userId: string, userRole: UserRole): Promise<ServiceResponse<ILecture>> => {
    try {
        const deletedLecture = await withTransaction(async (session) => {
            const lecture = await Lecture.findById(id).session(session);
            if (!lecture) throw createError("Lecture not found", 404);

            // 1. SECURITY: Enforce ownership
            await validateCourseAndOwnership(lecture.course.toString(), userId, userRole, session);

            // 2. Delete the lecture
            const deletedLecture = await Lecture.findByIdAndDelete(id, { session });

            // 3. Unlink from the parent chapter (Critical Integrity Step)
            await Chapter.findByIdAndUpdate(
                deletedLecture!.chapter, 
                { $pull: { lectures: deletedLecture!._id } },
                { session }
            );

            // 4. Invalidate caches
            await invalidateCache(`${LECTURE_CACHE_BASE}:${id}`);
            await invalidateCache(`${LECTURE_CACHE_BASE}:chapterId=${deletedLecture!.chapter}*`);
            await invalidateCache(`chapter:${deletedLecture!.chapter}`);
            await invalidateCache(`course:id=${lecture.course}`);

            return deletedLecture;
        });

        return {
            success: true,
            data: deletedLecture!,
            message: 'Lecture deleted successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Lecture deletion failed',
            errors: [error.message]
        };
    }
};

/**
 * Reorders lectures within a chapter with conflict resolution (Transactional Bulk Write).
 */
export const reorderLecturesService = async (chapterId: string, orderList: { lectureId: string; order: number }[], userId: string, userRole: UserRole): Promise<ServiceResponse<any>> => {
  try {
    const result = await withTransaction(async (session) => {
      const chapter = await Chapter.findById(chapterId).session(session);
      if (!chapter) throw createError("Chapter not found", 404);

      // SECURITY: Enforce ownership on the parent chapter
      const course = await validateCourseAndOwnership(chapter.course.toString(), userId, userRole, session); 

      // Convert lecture order list to the utility format
      const reorderRequests = orderList.map(item => ({
        itemId: item.lectureId,
        itemType: 'lecture' as const,
        order: item.order
      }));

      // Apply smart reorder logic using the utility
      const finalOrdering = await reorderChapterItemsWithConflictResolution(
        chapterId,
        reorderRequests,
        session
      );

      // Invalidate caches
      await invalidateCache(`${LECTURE_CACHE_BASE}:chapterId=${chapterId}*`);
      await invalidateCache(`chapter:${chapterId}`);
      await invalidateCache(`course:id=${course._id}`);

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
  } catch (error: any) {
    return {
      success: false,
      message: 'Lecture reordering failed',
      errors: [error.message]
    };
  }
};