"use strict";
// src/modules/courses/course.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseStats = exports.getCoursesByInstructor = exports.getFeaturedCourses = exports.getCourseAnalytics = exports.getRecommendedCourses = exports.searchCourses = exports.getCourseDetails = exports.checkEnrollmentStatus = exports.getAllCoursesService = exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.updateCourseDuration = void 0;
const mongoose_1 = require("mongoose");
const cloudinary_1 = __importDefault(require("cloudinary"));
const withTransaction_1 = require("../../utils/withTransaction");
const cache_1 = require("../../utils/cache");
const errorHandler_1 = require("../../utils/errorHandler");
const course_repository_1 = require("./course.repository");
const user_model_1 = __importDefault(require("../users/user.model"));
const email_1 = require("../../utils/email");
const enrollment_model_1 = __importDefault(require("../enrollments/enrollment.model"));
const chapter_model_1 = __importDefault(require("../chapters/chapter.model"));
const course_model_1 = __importDefault(require("./course.model"));
const review_model_1 = __importDefault(require("../reviews/review.model"));
const progress_model_1 = __importDefault(require("../progress/progress.model"));
// Utility function to update course total duration (optimized - no extra DB calls)
const updateCourseDuration = async (courseId, newDuration, session) => {
    const course = await course_model_1.default.findById(courseId).session(session);
    if (!course)
        return;
    if (newDuration !== undefined) {
        // Use provided duration (most efficient)
        course.totalDuration = newDuration;
    }
    else {
        // Fallback: calculate from existing chapters (only when needed)
        const chapters = await chapter_model_1.default.find({ course: courseId }).select('chapterDuration').session(session);
        course.totalDuration = chapters.reduce((total, chapter) => total + (chapter.chapterDuration || 0), 0);
    }
    await course.save({ session });
};
exports.updateCourseDuration = updateCourseDuration;
// --- Service Functions ---
// Function to create a new course
const createCourse = async (courseData, instructorId) => {
    try {
        let thumbnailData = undefined;
        // 1. External Call: Handle Cloudinary thumbnail upload
        if (courseData.thumbnail && typeof courseData.thumbnail === 'string') {
            const result = await cloudinary_1.default.v2.uploader.upload(courseData.thumbnail, {
                folder: 'course-thumbnails',
                width: 1280,
            });
            thumbnailData = { public_id: result.public_id, url: result.secure_url };
        }
        // Database Write (call functional repository)
        const course = await (0, course_repository_1.createCourse)({
            ...courseData,
            instructor: instructorId,
            thumbnail: thumbnailData,
        });
        // Business Logic: Email notification & Cache Invalidation
        const editCourseUrl = `${process.env.FRONTEND_URL}/courses/${course._id}/edit`;
        const instructor = await user_model_1.default.findById(instructorId);
        if (instructor) {
            await (0, email_1.sendEmail)(instructor.email, 'New Course Created', 'course-created', { instructorName: instructor.name, courseTitle: course.title, editCourseUrl });
        }
        if (courseData?.status === "published") {
            await (0, cache_1.invalidateCache)('courses:list');
        }
        return {
            success: true,
            data: course,
            message: 'Course created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Course creation failed',
            errors: [error.message]
        };
    }
};
exports.createCourse = createCourse;
// Function to update an existing course
const updateCourse = async (courseId, updateData, instructorId, instructorRole) => {
    try {
        // Security/Business Logic: Check existence and ownership (read from functional repo)
        const course = await (0, course_repository_1.findCourseById)(courseId);
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
                await cloudinary_1.default.v2.uploader.destroy(course.thumbnail.public_id);
            }
            // Upload new thumbnail
            const result = await cloudinary_1.default.v2.uploader.upload(updateData.thumbnail, {
                folder: 'course-thumbnails',
                width: 1280,
            });
            thumbnailData = { public_id: result.public_id, url: result.secure_url };
            updateData.thumbnail = thumbnailData;
        }
        // Database Update (write to functional repo)
        const updatedCourse = await (0, course_repository_1.updateCourse)(courseId, updateData);
        // Business Logic: Email notification & Cache Invalidation
        const instructor = await user_model_1.default.findById(instructorId);
        if (instructor && updateData.status === 'published' && updatedCourse) {
            const editCourseUrl = `${process.env.FRONTEND_URL}/courses/${courseId}/edit`;
            const viewCourseUrl = `${process.env.FRONTEND_URL}/courses/${courseId}`;
            await (0, email_1.sendEmail)(instructor.email, 'Course Updated', 'course-updated', {
                instructorName: instructor.name,
                courseTitle: updatedCourse.title,
                editCourseUrl,
                viewCourseUrl
            });
        }
        await (0, cache_1.invalidateCache)(`course:id=${courseId}`);
        await (0, cache_1.invalidateCache)('courses:list');
        return {
            success: true,
            data: updatedCourse,
            message: 'Course updated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Course update failed',
            errors: [error.message]
        };
    }
};
exports.updateCourse = updateCourse;
// Function to delete a course
const deleteCourse = async (courseId, instructorId, instructorRole) => {
    try {
        await (0, withTransaction_1.withTransaction)(async (session) => {
            const course = await (0, course_repository_1.findCourseById)(courseId, session);
            if (!course)
                throw (0, errorHandler_1.createError)('Course not found', 404);
            if (instructorRole !== 'admin' && course.instructor.toString() !== instructorId) {
                throw (0, errorHandler_1.createError)('You are not authorized to delete this course', 403);
            }
            // NOTE: This logic needs to be updated to handle the Chapter.content polymorphic array for complete deletion.
            const chapters = await chapter_model_1.default.find({ course: courseId }).session(session); // Direct DB call for transaction
            const chapterIds = chapters.map(c => c._id);
            // 1. Database Deletion (call functional repo)
            await (0, course_repository_1.deleteCourseDependencies)(courseId, chapterIds, session);
            // 2. External Call: Cloudinary Deletion
            if (course.thumbnail?.public_id) {
                await cloudinary_1.default.v2.uploader.destroy(course.thumbnail.public_id);
            }
            // 3. Final Course Deletion
            await (0, course_repository_1.deleteCourseById)(courseId, session);
            // Business Logic: Email notification
            const instructor = await user_model_1.default.findById(instructorId);
            if (instructor) {
                const createNewCourseUrl = `${process.env.FRONTEND_URL}/courses/create`;
                await (0, email_1.sendEmail)(instructor.email, 'Course Deleted', 'course-deleted', {
                    instructorName: instructor.name,
                    courseTitle: course.title,
                    createNewCourseUrl
                });
            }
        });
        // Cache Invalidation
        await (0, cache_1.invalidateCache)(`course:id=${courseId}`);
        await (0, cache_1.invalidateCache)('courses:list');
        return {
            success: true,
            data: null,
            message: 'Course deleted successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Course deletion failed',
            errors: [error.message]
        };
    }
};
exports.deleteCourse = deleteCourse;
// Function to get a list of all courses with caching
const getAllCoursesService = async (options) => {
    try {
        const { search, category, cacheKey } = options;
        // 1. Query construction: Always filter by status: 'published'
        const query = { status: 'published' };
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
            const cachedData = await (0, cache_1.getCache)(cacheKey);
            if (cachedData) {
                return {
                    success: true,
                    data: { ...cachedData, cached: true },
                    message: 'Courses retrieved from cache'
                };
            }
        }
        // Database Read (call functional repo)
        const totalCourses = await (0, course_repository_1.countCourses)(query);
        const courses = await (0, course_repository_1.findCourses)(query, options);
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
            await (0, cache_1.setCache)(cacheKey, responseData);
        }
        return {
            success: true,
            data: responseData,
            message: 'Courses retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve courses',
            errors: [error.message]
        };
    }
};
exports.getAllCoursesService = getAllCoursesService;
// Function to check enrollment status (for caching logic)
const checkEnrollmentStatus = async (courseId, userId) => {
    const userIdObj = new mongoose_1.Types.ObjectId(userId);
    const courseIdObj = new mongoose_1.Types.ObjectId(courseId);
    const enrollment = await enrollment_model_1.default.exists({
        course: courseIdObj,
        student: userIdObj
    });
    return !!enrollment;
};
exports.checkEnrollmentStatus = checkEnrollmentStatus;
// Function to get a single course by ID (Public preview content only)
const getCourseDetails = async (courseId, userId, cacheKey) => {
    try {
        // Database Read (Simple aggregation for public preview)
        const result = await (0, course_repository_1.aggregateCourseDetails)(courseId);
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
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course details',
            errors: [error.message]
        };
    }
};
exports.getCourseDetails = getCourseDetails;
// Enhanced course search with filters
const searchCourses = async (filters) => {
    const query = course_model_1.default.find({ status: 'published' });
    if (filters.category)
        query.where('category', filters.category);
    if (filters.level)
        query.where('level', filters.level);
    if (filters.rating)
        query.where('averageRating').gte(filters.rating);
    if (filters.search)
        query.where({ $text: { $search: filters.search } });
    if (filters.priceRange) {
        query.where('price').gte(filters.priceRange.min).lte(filters.priceRange.max);
    }
    return query.populate('instructor', 'name email avatar').sort({ createdAt: -1 });
};
exports.searchCourses = searchCourses;
// Get course recommendations based on user's enrolled courses
const getRecommendedCourses = async (userId) => {
    try {
        const enrolledCourses = await enrollment_model_1.default.find({ user: userId })
            .populate('course', 'category level');
        let courses;
        // If user has no enrollments, return popular courses
        if (enrolledCourses.length === 0) {
            courses = await course_model_1.default.find({ status: 'published' })
                .populate('instructor', 'name avatar')
                .sort({ enrollmentCount: -1, averageRating: -1 })
                .limit(6);
        }
        else {
            const categories = enrolledCourses.map(e => e.course.category);
            const enrolledCourseIds = enrolledCourses.map(e => e.course._id.toString());
            courses = await course_model_1.default.find({
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
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve recommended courses',
            errors: [error.message]
        };
    }
};
exports.getRecommendedCourses = getRecommendedCourses;
// Get course analytics
const getCourseAnalytics = async (courseId) => {
    try {
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return {
                success: false,
                message: 'Course not found',
                errors: ['No course found with the provided ID']
            };
        }
        const enrollments = await enrollment_model_1.default.countDocuments({ course: courseId });
        const reviews = await review_model_1.default.find({ course: courseId });
        const progress = await progress_model_1.default.find({ course: courseId });
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
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course analytics',
            errors: [error.message]
        };
    }
};
exports.getCourseAnalytics = getCourseAnalytics;
// Get featured courses
const getFeaturedCourses = async (limit = 6) => {
    try {
        const courses = await course_model_1.default.find({
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
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve featured courses',
            errors: [error.message]
        };
    }
};
exports.getFeaturedCourses = getFeaturedCourses;
// Get courses by instructor
const getCoursesByInstructor = async (instructorId) => {
    try {
        const courses = await course_model_1.default.find({ instructor: instructorId })
            .populate('instructor', 'name email avatar')
            .sort({ createdAt: -1 });
        return {
            success: true,
            data: courses,
            message: 'Instructor courses retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve instructor courses',
            errors: [error.message]
        };
    }
};
exports.getCoursesByInstructor = getCoursesByInstructor;
// Get course statistics
const getCourseStats = async (courseId) => {
    try {
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return {
                success: false,
                message: 'Course not found',
                errors: ['No course found with the provided ID']
            };
        }
        const enrollments = await enrollment_model_1.default.countDocuments({ course: courseId });
        const reviews = await review_model_1.default.find({ course: courseId });
        const progress = await progress_model_1.default.find({ course: courseId });
        const totalLectures = await chapter_model_1.default.aggregate([
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
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve course statistics',
            errors: [error.message]
        };
    }
};
exports.getCourseStats = getCourseStats;
//# sourceMappingURL=course.service.js.map