// src/modules/discussions/discussion.routes.ts

import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
import {
  createDiscussionHandler,
  answerDiscussionHandler,
  updateDiscussionHandler,
  deleteDiscussionHandler,
  getDiscussionHandler,
  getLectureDiscussionsHandler,
  getCourseDiscussionsHandler,
  getUserDiscussionsHandler,
} from "./discussion.controller";
import {
  createDiscussionSchema,
  answerDiscussionSchema,
  updateDiscussionSchema,
  discussionIdSchema,
  getLectureDiscussionsSchema,
  getCourseDiscussionsSchema,
  getUserDiscussionsSchema,
} from "./discussion.validation";

const router = Router();
const DISCUSSION_CACHE_BASE = 'discussions';

// --- MUTATION ROUTES ---

// POST new discussion
router.post(
  "/", 
  isAuthenticated,
  rbac('discussion:create'),
  validate(createDiscussionSchema), 
  createDiscussionHandler
);

// POST answer to discussion
router.post(
  "/:id/answer", 
  isAuthenticated,
  rbac('discussion:answer'),
  validate(discussionIdSchema),
  validate(answerDiscussionSchema), 
  answerDiscussionHandler
);

// PATCH update discussion 
router.patch(
  "/:id", 
  isAuthenticated,
  rbac('discussion:update'),
  validate(discussionIdSchema),
  validate(updateDiscussionSchema), 
  updateDiscussionHandler
);

// DELETE discussion
router.delete(
  "/:id", 
  isAuthenticated,
  rbac('discussion:delete'),
  validate(discussionIdSchema),
  deleteDiscussionHandler
);

// --- READ ROUTES ---

// GET single discussion
router.get(
    "/:id", 
    isAuthenticated,
    cacheMiddleware(DISCUSSION_CACHE_BASE, { param: 'id' }),
    validate(discussionIdSchema),
    getDiscussionHandler
);

// GET all discussions for a lecture
router.get(
    "/lecture/:lectureId", 
    isAuthenticated,
    cacheMiddleware(`${DISCUSSION_CACHE_BASE}:lectureId`, { param: 'lectureId', isList: true }),
    validate(getLectureDiscussionsSchema),
    getLectureDiscussionsHandler
);

// GET all discussions for a course
router.get(
    "/course/:courseId", 
    isAuthenticated,
    cacheMiddleware(`${DISCUSSION_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }),
    validate(getCourseDiscussionsSchema),
    getCourseDiscussionsHandler
);

// GET user's discussions (authenticated user)
router.get(
    "/user/me", 
    isAuthenticated,
    validate(getUserDiscussionsSchema),
    getUserDiscussionsHandler
);

export default router;
