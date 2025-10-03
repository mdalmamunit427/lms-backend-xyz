"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const enrollment_validation_1 = require("./enrollment.validation");
const enrollment_controller_1 = require("./enrollment.controller");
const router = (0, express_1.Router)();
// Payment routes
router.post('/create-session', auth_1.isAuthenticated, (0, validate_middleware_1.validate)(enrollment_validation_1.createCheckoutSessionSchema), enrollment_controller_1.createCheckoutSession);
// Enrolled courses routes
router.get('/enrolled-courses/:userId', auth_1.isAuthenticated, (0, validate_middleware_1.validate)(enrollment_validation_1.getUserEnrolledCoursesSchema), enrollment_controller_1.getEnrolledCoursesController);
router.get('/enrolled/:courseId', auth_1.isAuthenticated, (0, validate_middleware_1.validate)(enrollment_validation_1.getEnrolledCourseDetailsSchema), enrollment_controller_1.getEnrolledCourseController);
router.get('/check-enrollment/:courseId', auth_1.isAuthenticated, (0, validate_middleware_1.validate)(enrollment_validation_1.getEnrolledCourseDetailsSchema), enrollment_controller_1.checkEnrollmentController);
exports.default = router;
//# sourceMappingURL=enrollment.routes.js.map