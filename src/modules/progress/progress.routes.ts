import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
// src/modules/progress/progress.routes.ts

import {
  updateLectureProgressHandler,
  getCourseProgressHandler,
  getUserDashboardHandler,
  getCourseCompletionStatsHandler,
} from "./progress.controller";
import {
  updateLectureProgressSchema,
  getCourseProgressSchema,
  getCourseCompletionStatsSchema,
} from "./progress.validation";

const router = Router();
const PROGRESS_CACHE_BASE = 'progress';

// --- MUTATION ROUTES ---

// POST update lecture progress
router.post(
  "/lecture/:lectureId", 
  isAuthenticated,
  rbac('progress:update'),
  validate(updateLectureProgressSchema), 
  updateLectureProgressHandler
);

// --- READ ROUTES ---

// GET user dashboard (overview of all courses)
router.get(
    "/dashboard", 
    isAuthenticated,
    getUserDashboardHandler
);

// GET course progress for specific course
router.get(
    "/course/:courseId", 
    isAuthenticated,
    cacheMiddleware(`${PROGRESS_CACHE_BASE}:courseId`, { param: 'courseId' }),
    validate(getCourseProgressSchema),
    getCourseProgressHandler
);

// GET course completion statistics (instructor/admin only)
router.get(
    "/stats/course/:courseId", 
    isAuthenticated,
    cacheMiddleware(`progress-stats:courseId`, { param: 'courseId' }),
    validate(getCourseCompletionStatsSchema),
    getCourseCompletionStatsHandler
);


export default router;
