import { Router } from 'express';
import {
  createCourseController,
  updateCourseController,
  deleteCourseController,
  getAllCoursesController,
  getCourseByIdController,
  getRecommendedCoursesController,
  getFeaturedCoursesController,
  getCourseAnalyticsController,
  getCourseStatsController,
  getCoursesByInstructorController,
} from './course.controller';
import {
  createCourseSchema,
  updateCourseSchema,
  getCourseSchema, 
  getInstructorCoursesSchema,
} from './course.validation'; 

// --- IMPORTS FROM MIDDLEWARE UTILITIES ---
import { getMutationStack, getDeleteStack, getCacheStack } from '../../utils/middlewareStacks';
import { permissions } from '../../config/rbac'; 
import { validate } from '../../middlewares/validate.middleware'; 
import { cacheMiddleware } from '../../middlewares/cacheMiddleware';
import { isAuthenticated } from '../../middlewares/auth';
import { requireCourseOwnership } from '../../middlewares/courseOwnership.middleware';
import { rbac } from '../../middlewares/rbac.middleware'; 

const router = Router();
const COURSE_CACHE_BASE = 'course'; 

// ----------------------------------------------------------------------
// --- PUBLIC READ ROUTES (No Params, Parameterized, Coupon) ---
// ----------------------------------------------------------------------

// Get all courses with pagination (Public List Route - Exception to the stack pattern)
// NOTE: This route is manual because it validates QUERY params, not path params.
router.get(
  '/',
  cacheMiddleware('courses:list', { isList: true }),
  getAllCoursesController,
);

// Enhanced course functionality routes - MUST come before /:id route
// Get recommended courses for user
router.get(
  '/recommended',
  isAuthenticated,
  cacheMiddleware('courses:recommended', { isList: true }),
  getRecommendedCoursesController,
);

// Get featured courses
router.get(
  '/featured',
  cacheMiddleware('courses:featured', { isList: true }),
  getFeaturedCoursesController,
);

// Get a single course (Public, Parameterized)
router.get(
  '/:id',
  validate(getCourseSchema),
  cacheMiddleware('course', { param: 'id' }),
  getCourseByIdController,
);


// Create a new course (POST /create)
router.post(
  '/create',
  // Stack: Auth -> RBAC(create) -> Validate(createCourseSchema)
  ...getMutationStack(permissions.course.create, createCourseSchema),
  createCourseController,
);

// Update a course (PUT /:id)
router.put(
  '/:id',
  // Stack: Auth -> RBAC(update) -> Validate(getCourseSchema for params) -> Validate(updateCourseSchema for body)
  ...getMutationStack(permissions.course.update, updateCourseSchema, getCourseSchema),
  updateCourseController,
);

// Delete a course (DELETE /:id)
router.delete(
  '/:id',
  // Stack: Auth -> RBAC(delete) -> Validate(getCourseSchema for params)
  ...getDeleteStack(permissions.course.delete, getCourseSchema),
  deleteCourseController,
);

// Get course analytics (Instructor/Admin only - Course Owner only)
router.get(
  '/analytics/:id',
  isAuthenticated,
  rbac(permissions.course.analytics),
  validate(getCourseSchema),
  requireCourseOwnership,
  getCourseAnalyticsController,
);

// Get course statistics (Instructor/Admin only - Course Owner only)
router.get(
  '/stats/:id',
  isAuthenticated,
  rbac(permissions.course.stats),
  validate(getCourseSchema),
  requireCourseOwnership,
  getCourseStatsController,
);

// Get courses by instructor
router.get(
  '/instructor/:instructorId',
  ...getCacheStack('courses:instructor', { param: 'instructorId' }, getInstructorCoursesSchema),
  getCoursesByInstructorController,
);

export default router;