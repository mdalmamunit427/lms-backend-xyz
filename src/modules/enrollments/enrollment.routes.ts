import { Router } from 'express';
import express from 'express';
import { isAuthenticated } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate.middleware';
import { 
  createCheckoutSessionSchema, 
  getUserEnrolledCoursesSchema, 
  getEnrolledCourseDetailsSchema 
} from './enrollment.validation';
import { 
  createCheckoutSession, 
  getEnrolledCoursesController, 
  getEnrolledCourseController, 
  checkEnrollmentController 
} from './enrollment.controller';

const router = Router();

// Payment routes
router.post('/create-session', isAuthenticated, validate(createCheckoutSessionSchema), createCheckoutSession);

// Enrolled courses routes
router.get(
  '/enrolled-courses/:userId', 
  isAuthenticated, 
  validate(getUserEnrolledCoursesSchema), 
  getEnrolledCoursesController
);

router.get(
  '/enrolled/:courseId', 
  isAuthenticated, 
  validate(getEnrolledCourseDetailsSchema), 
  getEnrolledCourseController
);

router.get(
  '/check-enrollment/:courseId', 
  isAuthenticated, 
  validate(getEnrolledCourseDetailsSchema), 
  checkEnrollmentController
);

export default router;