"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const course_controller_1 = require("./course.controller");
const course_validation_1 = require("./course.validation");
// --- IMPORTS FROM MIDDLEWARE UTILITIES ---
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const rbac_1 = require("../../config/rbac");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const auth_1 = require("../../middlewares/auth");
const courseOwnership_middleware_1 = require("../../middlewares/courseOwnership.middleware");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
const COURSE_CACHE_BASE = 'course';
// ----------------------------------------------------------------------
// --- PUBLIC READ ROUTES (No Params, Parameterized, Coupon) ---
// ----------------------------------------------------------------------
// Get all courses with pagination (Public List Route - Exception to the stack pattern)
// NOTE: This route is manual because it validates QUERY params, not path params.
router.get('/', (0, cacheMiddleware_1.cacheMiddleware)('courses:list', { isList: true }), course_controller_1.getAllCoursesController);
// Enhanced course functionality routes - MUST come before /:id route
// Get recommended courses for user
router.get('/recommended', auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)('courses:recommended', { isList: true }), course_controller_1.getRecommendedCoursesController);
// Get featured courses
router.get('/featured', (0, cacheMiddleware_1.cacheMiddleware)('courses:featured', { isList: true }), course_controller_1.getFeaturedCoursesController);
// Get a single course (Public, Parameterized)
router.get('/:id', (0, validate_middleware_1.validate)(course_validation_1.getCourseSchema), (0, cacheMiddleware_1.cacheMiddleware)('course', { param: 'id' }), course_controller_1.getCourseByIdController);
// Create a new course (POST /create)
router.post('/create', 
// Stack: Auth -> RBAC(create) -> Validate(createCourseSchema)
...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.course.create, course_validation_1.createCourseSchema), course_controller_1.createCourseController);
// Update a course (PUT /:id)
router.put('/:id', 
// Stack: Auth -> RBAC(update) -> Validate(getCourseSchema for params) -> Validate(updateCourseSchema for body)
...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.course.update, course_validation_1.updateCourseSchema, course_validation_1.getCourseSchema), course_controller_1.updateCourseController);
// Delete a course (DELETE /:id)
router.delete('/:id', 
// Stack: Auth -> RBAC(delete) -> Validate(getCourseSchema for params)
...(0, middlewareStacks_1.getDeleteStack)(rbac_1.permissions.course.delete, course_validation_1.getCourseSchema), course_controller_1.deleteCourseController);
// Get course analytics (Instructor/Admin only - Course Owner only)
router.get('/analytics/:id', auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)(rbac_1.permissions.course.analytics), (0, validate_middleware_1.validate)(course_validation_1.getCourseSchema), courseOwnership_middleware_1.requireCourseOwnership, course_controller_1.getCourseAnalyticsController);
// Get course statistics (Instructor/Admin only - Course Owner only)
router.get('/stats/:id', auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)(rbac_1.permissions.course.stats), (0, validate_middleware_1.validate)(course_validation_1.getCourseSchema), courseOwnership_middleware_1.requireCourseOwnership, course_controller_1.getCourseStatsController);
// Get courses by instructor
router.get('/instructor/:instructorId', ...(0, middlewareStacks_1.getCacheStack)('courses:instructor', { param: 'instructorId' }, course_validation_1.getInstructorCoursesSchema), course_controller_1.getCoursesByInstructorController);
exports.default = router;
//# sourceMappingURL=course.routes.js.map