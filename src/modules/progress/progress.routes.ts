// src/modules/progress/progress.routes.ts

import { Router } from "express";
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
import { getCacheStack, getMutationStack } from "../../utils/middlewareStacks";
import { isAuthenticated } from "../../middlewares/auth";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
import { requireEnrollmentForLectureParam } from "../../middlewares/enrollment.middleware";

const router = Router();
const PROGRESS_CACHE_BASE = 'progress';

// --- MUTATION ROUTES ---

// POST update lecture progress
router.post(
  "/lecture/:lectureId", 
  ...getMutationStack('progress:update', updateLectureProgressSchema), 
  requireEnrollmentForLectureParam,
  updateLectureProgressHandler
);


// --- READ ROUTES ---

// GET user dashboard (overview of all courses)
router.get(
    "/dashboard", 
    isAuthenticated,
    cacheMiddleware(`${PROGRESS_CACHE_BASE}:dashboard`),
    getUserDashboardHandler
);

// GET course progress for specific course
router.get(
    "/course/:courseId", 
    ...getCacheStack(`${PROGRESS_CACHE_BASE}:courseId`, { param: 'courseId' }, getCourseProgressSchema),
    getCourseProgressHandler
);

// GET course completion statistics (instructor/admin only)
router.get(
    "/stats/course/:courseId", 
    ...getCacheStack(`progress-stats:courseId`, { param: 'courseId' }, getCourseCompletionStatsSchema),
    getCourseCompletionStatsHandler
);


export default router;
