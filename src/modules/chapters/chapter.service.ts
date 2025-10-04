// src/modules/chapters/chapter.service.ts

import mongoose, { Schema, Types } from "mongoose";
import Lecture, { ILecture } from "../lectures/lecture.model";
import { createError } from "../../utils/errorHandler";
import { withTransaction } from "../../utils/withTransaction";
import Chapter, { IChapter } from "./chapter.model";
import { invalidateCache, invalidateCacheAsync, setCache } from "../../utils/cache";
import { validateCourseAndOwnership } from "../../utils/ownership";
import { updateCourseDuration } from "../courses/course.service";
import { ServiceResponse } from "../../@types/api";
import { reorderChapterItemsWithConflictResolution, reorderCourseChaptersWithConflictResolution } from "../../utils/chapterReorder";


// --- Type Definitions for Service Logic ---
const CHAPTER_CACHE_BASE = 'chapters';

export type ICreateChapterData = { title: string; course: string; order?: number };
export type IUpdateChapterData = { title?: string; order?: number };
export type IReorderItem = { 
  chapterId: string; 
  order: number; 
  lectures?: { lectureId: string; order: number }[] 
};
export type ILectureData = Omit<ILecture, "chapter" | "course" | "order">;
export type UserRole = 'admin' | 'instructor' | 'student';

// Utility function to update chapter duration (optimized - minimal DB calls)
export const updateChapterDuration = async (chapterId: string, session?: any): Promise<void> => {
  const chapter = await Chapter.findById(chapterId).session(session);
  if (!chapter) return;

  // Get all lectures in this chapter (only duration field)
  const lectures = await Lecture.find({ chapter: chapterId }).select('duration').session(session);
  
  // Calculate total duration
  const totalDuration = lectures.reduce((total, lecture) => total + (lecture.duration || 0), 0);
  
  // Update chapter duration
  chapter.chapterDuration = totalDuration;
  await chapter.save({ session });

  // Note: Course duration will be calculated by aggregation pipeline on next API call
  // This avoids unnecessary DB calls for course updates
};

export const createChapter = async (data: ICreateChapterData, userId: string, userRole: UserRole): Promise<ServiceResponse<IChapter>> => {
  try {
    const chapter = await withTransaction(async (session) => {
      // SECURITY: Enforce ownership
      await validateCourseAndOwnership(data.course, userId, userRole);

      let order: number;
      
      if (data.order !== undefined) {
        // Use smart conflict resolution for specified order
        // Create chapter with temporary order first (since order field is required)
        const tempOrder = (await Chapter.countDocuments({ course: data.course }).session(session)) + 1000; // High temporary order
        const createdChapters = await Chapter.create([{ 
          title: data.title,
          course: data.course,
          order: tempOrder,
          chapterDuration: 0
        }], { session, ordered: true });
        
        if (createdChapters.length === 0 || !createdChapters[0]) {
          throw createError("Failed to create chapter", 500);
        }
        
        const chapter = createdChapters[0];
        
        // Apply smart reorder logic to place the chapter at the desired position
        await reorderCourseChaptersWithConflictResolution(
          data.course,
          [{ chapterId: (chapter._id as any).toString(), order: data.order }],
          session
        );
        
        // Invalidate relevant caches (non-blocking, async)
        invalidateCacheAsync(`course:id=${data.course}`);
        invalidateCacheAsync(`${CHAPTER_CACHE_BASE}:courseId=${data.course}`);
        invalidateCacheAsync("courses:list");
        
        return chapter;
      } else {
        // Auto-calculate order (existing behavior)
        order = (await Chapter.countDocuments({ course: data.course }).session(session)) + 1;
        const [chapter] = await Chapter.create([{ 
          title: data.title,
          course: data.course,
          order: order,
          chapterDuration: 0
        }], { session, ordered: true});

        // Invalidate relevant caches (batch, non-blocking)
        Promise.all([
          invalidateCache(`course:id=${data.course}`),
          invalidateCache("courses:list"),
        ]).catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));

        return chapter;
      }
    });

    return {
      success: true,
      data: chapter,
      message: 'Chapter created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Chapter creation failed',
      errors: [error.message]
    };
  }
};

/**
 * Create Chapter with multiple Lectures (Transactional)
 */
export const createChapterWithLectures = async (
  chapterData: ICreateChapterData,
  lecturesData: ILectureData[],
  userId: string,
  userRole: UserRole
): Promise<ServiceResponse<{ chapter: IChapter; lectures: ILecture[] }>> => {
  try {
    const result = await withTransaction(async (session: mongoose.ClientSession) => {
      // 1. SECURITY: Enforce ownership
      await validateCourseAndOwnership(chapterData.course, userId, userRole);

      let chapter: IChapter;
      
      if (chapterData.order !== undefined) {
        // Use smart conflict resolution for specified order
        // Create chapter with temporary high order first (since order field is required)
        const tempOrder = (await Chapter.countDocuments({ course: chapterData.course }).session(session)) + 1000;
        const chapterDataClean = { 
          title: chapterData.title,
          course: chapterData.course,
          order: tempOrder,
          chapterDuration: 0
        };
        const createdChapters = await Chapter.create([chapterDataClean], { session, ordered: true });
        
        if (createdChapters.length === 0 || !createdChapters[0]) {
          throw createError("Failed to create chapter", 500);
        }
        
        chapter = createdChapters[0];
        // Explicitly remove content field if it exists using MongoDB operation
        await Chapter.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
        
        // Apply smart reorder logic to place the chapter at the desired position
        await reorderCourseChaptersWithConflictResolution(
          chapterData.course,
          [{ chapterId: (chapter._id as any).toString(), order: chapterData.order }],
          session
        );
      } else {
        // Auto-calculate order (existing behavior)
        const order = (await Chapter.countDocuments({ course: chapterData.course }).session(session)) + 1;
        const chapterDataClean = { 
          title: chapterData.title,
          course: chapterData.course,
          order: order,
          chapterDuration: 0
        };
        const createdChapters = await Chapter.create([chapterDataClean], { session, ordered: true });
        
        if (createdChapters.length === 0 || !createdChapters[0]) {
          throw createError("Failed to create chapter", 500);
        }
        
        chapter = createdChapters[0];
        // Explicitly remove content field if it exists using MongoDB operation
        await Chapter.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
      }

      // 4. Prepare lecture data
      const lecturesToCreate = lecturesData.map((lec, idx) => ({
        ...lec,
        chapter: chapter._id,
        course: chapterData.course,
        order: idx + 1, // Auto-order lectures within the chapter
      }));

      // 5. Create lectures (Transactional part 2) - FIX: Added ordered: true
      const createdLectures = await Lecture.create(lecturesToCreate, { session, ordered: true });

      // 6. Lectures are now stored in lectures collection - no need to update chapter content

      // 7. Calculate and update chapter duration
      const newChapterDuration = createdLectures.reduce((total, lecture) => total + (lecture.duration || 0), 0);
      chapter.chapterDuration = newChapterDuration;
      // Explicitly remove content field before saving using MongoDB operation
      await Chapter.findByIdAndUpdate(chapter._id, { $unset: { content: 1 } }, { session });
      await chapter.save({ session });

      // 8. Update course total duration in database
      await updateCourseDuration(chapterData.course, undefined, session);

      // 9. Invalidate caches (non-blocking)
      invalidateCacheAsync(`course:id=${chapterData.course}`);
      invalidateCacheAsync(`${CHAPTER_CACHE_BASE}:courseId=${chapterData.course}`);
      invalidateCacheAsync("courses:list");
      await invalidateCache(`${CHAPTER_CACHE_BASE}:${chapter._id}`);

      return { chapter, lectures: createdLectures };
    });

    return {
      success: true,
      data: result,
      message: 'Chapter with lectures created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Chapter with lectures creation failed',
      errors: [error.message]
    };
  }
};

/**
 * Update Chapter (title / order) - OPTIMIZED VERSION
 * Reduces database calls by optimizing validation and reordering
 */
export const updateChapter = async (id: string, data: IUpdateChapterData, userId: string, userRole: UserRole): Promise<ServiceResponse<IChapter>> => {
  try {
    const chapter = await withTransaction(async (session) => {
      // OPTIMIZATION: Single query with projection to get only needed fields
      const chapter = await Chapter.findById(id, { 
        _id: 1, 
        title: 1, 
        order: 1, 
        course: 1 
      }).session(session);
      
      if (!chapter) throw createError("Chapter not found", 404);

      // SECURITY: Enforce ownership check on the course the chapter belongs to
      await validateCourseAndOwnership(chapter.course.toString(), userId, userRole);

      // OPTIMIZATION: Only update title if provided and different
      if (data.title !== undefined && data.title !== chapter.title) {
        chapter.title = data.title;
      }

      // OPTIMIZATION: Only reorder if order is provided and different
      if (data.order !== undefined && data.order !== chapter.order) {
        // Apply smart reorder logic for chapter order changes
        await reorderCourseChaptersWithConflictResolution(
          chapter.course.toString(),
          [{ chapterId: id, order: data.order }],
          session
        );
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
      Promise.all(cacheKeys.map(key => invalidateCache(key)))
        .catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));

      return chapter;
    });

    return {
      success: true,
      data: chapter,
      message: 'Chapter updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Chapter update failed',
      errors: [error.message]
    };
  }
};

export const deleteChapterService = async (chapterId: string, userId: string, userRole: UserRole): Promise<ServiceResponse<IChapter>> => {
    try {
        const chapter = await withTransaction(async (session) => {
            const chapter = await Chapter.findById(chapterId).session(session);
            if (!chapter) throw createError("Chapter not found", 404);

            // 1. SECURITY: Enforce ownership
            await validateCourseAndOwnership(chapter.course.toString(), userId, userRole);

            // 2. CASCADING DELETE: Delete all associated Lectures (Lessons)
            // If this fails, the chapter deletion will roll back.
            await Lecture.deleteMany({ chapter: chapterId }, { session });

            // 3. Delete the Chapter
            const deletedChapter = await Chapter.findByIdAndDelete(chapterId, { session });

            // 4. Invalidate relevant caches
            if (deletedChapter) {
                await invalidateCache(`${CHAPTER_CACHE_BASE}:${chapterId}`);
                await invalidateCache(`course:id=${deletedChapter.course}`);
                await invalidateCache(`${CHAPTER_CACHE_BASE}:courseId=${deletedChapter.course}`);
                await invalidateCache("courses:list");
            }
            
            return deletedChapter;
        });

        return {
            success: true,
            data: chapter!,
            message: 'Chapter deleted successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Chapter deletion failed',
            errors: [error.message]
        };
    }
};
/**
 * Reorder Chapters with Lectures - OPTIMIZED VERSION
 * Reduces database calls by optimizing existing operations
 */
export const reorderChaptersWithLectures = async (
    courseId: string, 
    orderList: IReorderItem[], 
    userId: string, 
    userRole: UserRole
): Promise<ServiceResponse<boolean>> => {
    try {
        await withTransaction(async (session) => {
            // 1. SECURITY: Enforce ownership (single call)
            await validateCourseAndOwnership(courseId, userId, userRole);

            // 2. OPTIMIZATION: Batch chapter reordering operations
            const chapterReorderRequests = orderList.map(item => ({
                chapterId: item.chapterId,
                order: item.order
            }));

            // Apply smart reorder logic for chapters (handles conflicts automatically)
            await reorderCourseChaptersWithConflictResolution(
                courseId,
                chapterReorderRequests,
                session
            );

            // 3. OPTIMIZATION: Batch lecture reordering operations for all chapters
            const lectureReorderPromises = orderList
                .filter(chapterOrder => chapterOrder.lectures && chapterOrder.lectures.length > 0)
                .map(chapterOrder => {
                    const reorderRequests = chapterOrder.lectures!.map(item => ({
                        itemId: item.lectureId,
                        itemType: 'lecture' as const,
                        order: item.order
                    }));

                    return reorderChapterItemsWithConflictResolution(
                        chapterOrder.chapterId,
                        reorderRequests,
                        session
                    );
                });

            // Execute all lecture reordering operations in parallel
            if (lectureReorderPromises.length > 0) {
                await Promise.all(lectureReorderPromises);
            }
            
            // 4. OPTIMIZATION: Batch cache invalidation operations
            const cacheKeys = [
                `course:id=${courseId}`,
                `${CHAPTER_CACHE_BASE}:courseId=${courseId}`,
                "courses:list",
                ...orderList.map(c => `${CHAPTER_CACHE_BASE}:${c.chapterId}`)
            ];
            
            // Execute cache invalidation in parallel (non-blocking)
            Promise.all(cacheKeys.map(key => invalidateCache(key)))
                .catch(err => console.error('Cache invalidation failed (non-blocking):', err?.message || err));

            return true;
        });

        return {
            success: true,
            data: true,
            message: 'Chapters and lectures reordered successfully'
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Chapter reordering failed',
            errors: [error.message]
        };
    }
};

/**
 * Get Chapters for a Course (IMPLEMENTING CACHING)
 */
export const getChaptersByCourse = async (courseId: string, cacheKey: string): Promise<ServiceResponse<any>> => {
  try {
    const chapters = await Chapter.find({ course: courseId }).sort({ order: 1 }).lean();
    
    // Set cache on DB read
    const responseData = { chapters, cached: false };
    await setCache(cacheKey, responseData);
    
    return {
      success: true,
      data: responseData,
      message: 'Chapters retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve chapters',
      errors: [error.message]
    };
  }
};

/**
 * Get Single Chapter (IMPLEMENTING CACHING)
 */
export const getChapterById = async (id: string, cacheKey: string): Promise<ServiceResponse<any>> => {
  try {
    const chapter = await Chapter.findById(id).lean();
    
    if (!chapter) {
      return {
        success: false,
        message: 'Chapter not found',
        errors: ['No chapter found with the provided ID']
      };
    }
    
    // Set cache on DB read
    const responseData = { chapter, cached: false };
    await setCache(cacheKey, responseData);
    
    return {
      success: true,
      data: responseData,
      message: 'Chapter retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve chapter',
      errors: [error.message]
    };
  }
};

