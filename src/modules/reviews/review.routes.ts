// src/modules/reviews/review.routes.ts

import { Router } from "express";
import {
  createReviewHandler,
  updateReviewHandler,
  deleteReviewHandler,
  getReviewHandler,
  getCourseReviewsHandler,
  getUserReviewsHandler,
  getCourseReviewStatsHandler,
} from "./review.controller";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  getCourseReviewsSchema,
  getUserReviewsSchema,
  getCourseReviewStatsSchema,
} from "./review.validation";
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";
import { requireEnrollmentForCourseBody } from "../../middlewares/enrollment.middleware";

const router = Router();
const REVIEW_CACHE_BASE = 'reviews';

// --- MUTATION ROUTES ---

// POST new review
router.post(
  "/", 
  ...getMutationStack('review:create', createReviewSchema), 
  requireEnrollmentForCourseBody,
  createReviewHandler
);

// PATCH update review 
router.patch(
  "/:id", 
  ...getMutationStack('review:update', updateReviewSchema, reviewIdSchema), 
  updateReviewHandler
);

// DELETE review
router.delete(
  "/:id", 
  ...getDeleteStack('review:delete', reviewIdSchema),
  deleteReviewHandler
);

// --- READ ROUTES ---

// GET single review
router.get(
    "/:id", 
    ...getCacheStack(REVIEW_CACHE_BASE, { param: 'id' }, reviewIdSchema),
    getReviewHandler
);

// GET all reviews for a course
router.get(
    "/course/:courseId", 
    ...getCacheStack(`${REVIEW_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, getCourseReviewsSchema),
    getCourseReviewsHandler
);

// GET course review statistics
router.get(
    "/stats/course/:courseId", 
    ...getCacheStack(`review-stats:courseId`, { param: 'courseId' }, getCourseReviewStatsSchema),
    getCourseReviewStatsHandler
);

// GET user's reviews (authenticated user)
router.get(
    "/user/me", 
    ...getCacheStack(`${REVIEW_CACHE_BASE}:user`, { param: 'user', isList: true }, getUserReviewsSchema),
    getUserReviewsHandler
);

export default router;
