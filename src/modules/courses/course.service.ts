// src/modules/courses/course.service.ts

import { Types } from "mongoose";
import cloudinary from "cloudinary";
import { withTransaction } from "../../utils/withTransaction";
import { invalidateCache, setCache, getCache } from "../../utils/cache";
import { createError } from "../../utils/errorHandler";
import {
    countCourses,
    findCourses,
    findCourseById,
    aggregateCourseDetails,
    createCourse as createCourseRepo,
    updateCourse as updateCourseRepo,
    deleteCourseDependencies,
    deleteCourseById
} from "./course.repository";
import User from "../users/user.model";
import { sendEmail } from "../../utils/email";
import Enrollment from "../enrollments/enrollment.model";
import Chapter from "../chapters/chapter.model";
import Course from "./course.model";
import Review from "../reviews/review.model";
import CourseProgress from "../progress/progress.model";
import { ServiceResponse } from "../../@types/api";
import { createQueryBuilder, addSearch, addFilters, addPagination, buildQuery } from "../../utils/queryBuilder";

// --- Types ---
type CourseQueryOptions = {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  cacheKey?: string;
};

// --- Service Functions ---


// Function to create a new course
export const createCourse = async (courseData: any, instructorId: string): Promise<ServiceResponse<any>> => {
  try {
    let thumbnailData = undefined;

    // 1. External Call: Handle Cloudinary thumbnail upload
    if (courseData.thumbnail && typeof courseData.thumbnail === 'string') {
      const result = await cloudinary.v2.uploader.upload(courseData.thumbnail, {
        folder: 'course-thumbnails',
        width: 1280,
      });
      thumbnailData = { public_id: result.public_id, url: result.secure_url };
    }

    // Database Write (call functional repository)
    const course = await createCourseRepo({ 
      ...courseData, 
      instructor: instructorId,
      thumbnail: thumbnailData,
    });
    
    // Business Logic: Email notification & Cache Invalidation
    const editCourseUrl = `${process.env.FRONTEND_URL}/courses/${course._id}/edit`;
    const instructor = await User.findById(instructorId);
    if (instructor) { 
      await sendEmail(
        instructor.email,
        'New Course Created',
        'course-created',
        { instructorName: instructor.name, courseTitle: course.title, editCourseUrl}
      );
    }

    if(courseData?.status === "published") {
      await invalidateCache('courses:list');
    }
    
    return {
      success: true,
      data: course,
      message: 'Course created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Course creation failed',
      errors: [error.message]
    };
  }
};

// Function to update an existing course
export const updateCourse = async (courseId: string, updateData: any, instructorId: string, instructorRole: string): Promise<ServiceResponse<any>> => {
  try {
    // Security/Business Logic: Check existence and ownership (read from functional repo)
    const course = await findCourseById(courseId);
    if (!course) {
      return {
        success: false,
        message: 'Course not found',
        errors: ['No course found with the provided ID']
      };
    }

    if (instructorRole !== 'admin' && course.instructor.toString() !== instructorId) {
      return {
        success: false,
        message: 'You are not authorized to update this course',
        errors: ['Insufficient permissions to update this course']
      };
    }

    // External Call: Handle Cloudinary update/deletion
    let thumbnailData = undefined;
    if (updateData.thumbnail && typeof updateData.thumbnail === 'string') {
      // If there's an existing thumbnail, delete it first
      if (course.thumbnail?.public_id) {
        await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);
      }
      
      // Upload new thumbnail
      const result = await cloudinary.v2.uploader.upload(updateData.thumbnail, {
        folder: 'course-thumbnails',
        width: 1280,
      });
      thumbnailData = { public_id: result.public_id, url: result.secure_url };
      updateData.thumbnail = thumbnailData;
    }

    // Database Update (write to functional repo)
    const updatedCourse = await updateCourseRepo(courseId, updateData);
    
    // Business Logic: Email notification & Cache Invalidation
    const instructor = await User.findById(instructorId);
    if (instructor && updateData.status === 'published' && updatedCourse) {
      const editCourseUrl = `${process.env.FRONTEND_URL}/courses/${courseId}/edit`;
      const viewCourseUrl = `${process.env.FRONTEND_URL}/courses/${courseId}`;
      await sendEmail(
        instructor.email,
        'Course Updated',
        'course-updated',
        { 
          instructorName: instructor.name, 
          courseTitle: updatedCourse.title, 
          editCourseUrl,
          viewCourseUrl
        }
      );
    }
    await invalidateCache(`course:id=${courseId}`);
    await invalidateCache('courses:list');
    
    return {
      success: true,
      data: updatedCourse,
      message: 'Course updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Course update failed',
      errors: [error.message]
    };
  }
};

// Function to delete a course
export const deleteCourse = async (courseId: string, instructorId: string, instructorRole: string): Promise<ServiceResponse<null>> => {
  try {
    await withTransaction(async (session) => {
      const course = await findCourseById(courseId, session);
      if (!course) throw createError('Course not found', 404);
      if (instructorRole !== 'admin' && course.instructor.toString() !== instructorId) {
          throw createError('You are not authorized to delete this course', 403);
      }
      
      // NOTE: This logic needs to be updated to handle the Chapter.content polymorphic array for complete deletion.
      const chapters = await Chapter.find({ course: courseId }).session(session); // Direct DB call for transaction
      const chapterIds = chapters.map(c => c._id);

      // 1. Database Deletion (call functional repo)
      await deleteCourseDependencies(courseId, chapterIds as Types.ObjectId[], session);

      // 2. External Call: Cloudinary Deletion
      if (course.thumbnail?.public_id) {
        await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);
      }

      // 3. Final Course Deletion
      await deleteCourseById(courseId, session);

      // Business Logic: Email notification
      const instructor = await User.findById(instructorId);
      if (instructor) {
        const createNewCourseUrl = `${process.env.FRONTEND_URL}/courses/create`;
        await sendEmail(
          instructor.email,
          'Course Deleted',
          'course-deleted',
          { 
            instructorName: instructor.name, 
            courseTitle: course.title,
            createNewCourseUrl
          }
        );
      }
    });

    // Cache Invalidation
    await invalidateCache(`course:id=${courseId}`);
    await invalidateCache('courses:list');
    
    return {
      success: true,
      data: null,
      message: 'Course deleted successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Course deletion failed',
      errors: [error.message]
    };
  }
};

// Function to get a list of all courses with caching
export const getAllCoursesService = async (options: CourseQueryOptions): Promise<ServiceResponse<{ data: any[]; pagination: any }>> => {
  try {
    const { search, category, cacheKey } = options;

    // 1. Query construction: Always filter by status: 'published'
    const query: any = { status: 'published' }; 

    // 2. Add Category Filter
    if (category) {
      query.category = category;
    }

    // 3. Add Search Filter (for title and description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Caching Logic
    if (cacheKey) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: { ...cachedData, cached: true },
          message: 'Courses retrieved from cache'
        };
      }
    }
    
    // Database Read (call functional repo)
    const totalCourses = await countCourses(query);
    const courses = await findCourses(query, options);

    const responseData = {
      data: courses,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: totalCourses,
        totalPages: Math.ceil(totalCourses / options.limit),
      }
    };

    // Caching Logic
    if (cacheKey) {
      await setCache(cacheKey, responseData);
    }

    return {
      success: true,
      data: responseData,
      message: 'Courses retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve courses',
      errors: [error.message]
    };
  }
};

// Function to check enrollment status (for caching logic)
export const checkEnrollmentStatus = async (courseId: string, userId: string): Promise<boolean> => {
  const userIdObj = new Types.ObjectId(userId);
  const courseIdObj = new Types.ObjectId(courseId);
  
  const enrollment = await Enrollment.exists({ 
    course: courseIdObj, 
    student: userIdObj 
  });
  
  return !!enrollment;
};

// Function to get a single course by ID (Public preview content only)
export const getCourseDetails = async (courseId: string, userId?: string, cacheKey?: string): Promise<ServiceResponse<any>> => {
  try {
    // Database Read (Simple aggregation for public preview)
    const result = await aggregateCourseDetails(courseId);

    if (!result || result.length === 0) {
      return {
        success: false,
        message: 'Course not found',
        errors: ['No course found with the provided ID']
      };
    }

    return {
      success: true,
      data: {
        isEnrolled: false, // Always false for public preview
        ...result[0]
      },
      message: 'Course details retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve course details',
      errors: [error.message]
    };
  }
};

// Enhanced course search with filters
export const searchCourses = async (filters: {
  category?: string;
  level?: string;
  priceRange?: { min: number; max: number };
  rating?: number;
  instructor?: string;
  search?: string;
}) => {
  const query = Course.find({ status: 'published' });
  
  if (filters.category) query.where('category', filters.category);
  if (filters.level) query.where('level', filters.level);
  if (filters.rating) query.where('averageRating').gte(filters.rating);
  if (filters.search) query.where({ $text: { $search: filters.search } });
  if (filters.priceRange) {
    query.where('price').gte(filters.priceRange.min).lte(filters.priceRange.max);
  }
  
  return query.populate('instructor', 'name email avatar').sort({ createdAt: -1 });
};

// Get course recommendations based on user's enrolled courses
export const getRecommendedCourses = async (userId: string): Promise<ServiceResponse<any[]>> => {
  try {
    const enrolledCourses = await Enrollment.find({ user: userId })
      .populate('course', 'category level');
    
    let courses;
    
    // If user has no enrollments, return popular courses
    if (enrolledCourses.length === 0) {
      courses = await Course.find({ status: 'published' })
        .populate('instructor', 'name avatar')
        .sort({ enrollmentCount: -1, averageRating: -1 })
        .limit(6);
    } else {
      const categories = enrolledCourses.map(e => (e.course as any).category);
      const enrolledCourseIds = enrolledCourses.map(e => e.course._id.toString());
      
      courses = await Course.find({
        category: { $in: categories },
        _id: { $nin: enrolledCourseIds },
        status: 'published'
      }).populate('instructor', 'name avatar').limit(6);
    }
    
    return {
      success: true,
      data: courses,
      message: 'Recommended courses retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve recommended courses',
      errors: [error.message]
    };
  }
};

// Get course analytics
export const getCourseAnalytics = async (courseId: string): Promise<ServiceResponse<any>> => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return {
        success: false,
        message: 'Course not found',
        errors: ['No course found with the provided ID']
      };
    }
    
    const enrollments = await Enrollment.countDocuments({ course: courseId });
    const reviews = await Review.find({ course: courseId });
    const progress = await CourseProgress.find({ course: courseId });
    
    const completionRate = progress.length > 0 
      ? (progress.filter(p => p.isCourseCompleted).length / progress.length) * 100 
      : 0;
    
    return {
      success: true,
      data: {
        course: course.title,
        enrollments,
        reviews: reviews.length,
        averageRating: course.averageRating,
        completionRate: Math.round(completionRate),
        totalRevenue: enrollments * course.price
      },
      message: 'Course analytics retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve course analytics',
      errors: [error.message]
    };
  }
};

// Get featured courses
export const getFeaturedCourses = async (limit: number = 6): Promise<ServiceResponse<any[]>> => {
  try {
    const courses = await Course.find({ 
      status: 'published',
      averageRating: { $gte: 4.0 }
    })
    .populate('instructor', 'name avatar')
    .sort({ enrollmentCount: -1, averageRating: -1 })
    .limit(limit);
    
    return {
      success: true,
      data: courses,
      message: 'Featured courses retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve featured courses',
      errors: [error.message]
    };
  }
};

// Get courses by instructor
export const getCoursesByInstructor = async (instructorId: string): Promise<ServiceResponse<any[]>> => {
  try {
    const courses = await Course.find({ instructor: instructorId })
      .populate('instructor', 'name email avatar')
      .sort({ createdAt: -1 });
    
    return {
      success: true,
      data: courses,
      message: 'Instructor courses retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve instructor courses',
      errors: [error.message]
    };
  }
};

// Get course statistics
export const getCourseStats = async (courseId: string): Promise<ServiceResponse<any>> => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return {
        success: false,
        message: 'Course not found',
        errors: ['No course found with the provided ID']
      };
    }
    
    const enrollments = await Enrollment.countDocuments({ course: courseId });
    const reviews = await Review.find({ course: courseId });
    const progress = await CourseProgress.find({ course: courseId });
    
    const totalLectures = await Chapter.aggregate([
      { $match: { course: courseId } },
      { $unwind: '$content' },
      { $match: { 'content.type': 'lecture' } },
      { $count: 'total' }
    ]);
    
    const completedCourses = progress.filter(p => p.isCourseCompleted).length;
    const completionRate = enrollments > 0 ? (completedCourses / enrollments) * 100 : 0;
    
    return {
      success: true,
      data: {
        course: {
          title: course.title,
          price: course.price,
          averageRating: course.averageRating,
          reviewCount: course.reviewCount
        },
        stats: {
          enrollments,
          totalLectures: totalLectures[0]?.total || 0,
          completedCourses,
          completionRate: Math.round(completionRate),
          averageReviewRating: reviews.length > 0 
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
            : 0
        }
      },
      message: 'Course statistics retrieved successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve course statistics',
      errors: [error.message]
    };
  }
};