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
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";

const router = Router();
const REVIEW_CACHE_BASE = 'reviews';

// --- MUTATION ROUTES ---

// POST new review
router.post(
  "/", 
  isAuthenticated,
  rbac('review:create'),
  validate(createReviewSchema), 
  createReviewHandler
);

// PATCH update review 
router.patch(
  "/:id", 
  isAuthenticated,
  rbac('review:update'),
  validate(reviewIdSchema),
  validate(updateReviewSchema), 
  updateReviewHandler
);

// DELETE review
router.delete(
  "/:id", 
  isAuthenticated,
  rbac('review:delete'),
  validate(reviewIdSchema),
  deleteReviewHandler
);

// --- READ ROUTES ---

// GET single review
router.get(
    "/:id", 
    isAuthenticated,
    cacheMiddleware(REVIEW_CACHE_BASE, { param: 'id' }),
    validate(reviewIdSchema),
    getReviewHandler
);

// GET all reviews for a course
router.get(
    "/course/:courseId", 
    isAuthenticated,
    cacheMiddleware(`${REVIEW_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }),
    validate(getCourseReviewsSchema),
    getCourseReviewsHandler
);

// GET course review statistics
router.get(
    "/stats/course/:courseId", 
    isAuthenticated,
    cacheMiddleware(`review-stats:courseId`, { param: 'courseId' }),
    validate(getCourseReviewStatsSchema),
    getCourseReviewStatsHandler
);

// GET user's reviews (authenticated user)
router.get(
    "/user/me", 
    isAuthenticated,
    validate(getUserReviewsSchema),
    getUserReviewsHandler
);

export default router;
