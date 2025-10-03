// src/modules/discussions/discussion.routes.ts

import { Router } from "express";
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
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";
import { requireEnrollmentForLectureBody, requireEnrollmentForDiscussionParam } from "../../middlewares/enrollment.middleware";

const router = Router();
const DISCUSSION_CACHE_BASE = 'discussions';

// --- MUTATION ROUTES ---

// POST new discussion
router.post(
  "/", 
  ...getMutationStack('discussion:create', createDiscussionSchema), 
  requireEnrollmentForLectureBody,
  createDiscussionHandler
);

// POST answer to discussion
router.post(
  "/:id/answer", 
  ...getMutationStack('discussion:update', answerDiscussionSchema, discussionIdSchema), 
  requireEnrollmentForDiscussionParam,
  answerDiscussionHandler
);

// PATCH update discussion 
router.patch(
  "/:id", 
  ...getMutationStack('discussion:update', updateDiscussionSchema, discussionIdSchema), 
  updateDiscussionHandler
);

// DELETE discussion
router.delete(
  "/:id", 
  ...getDeleteStack('discussion:delete', discussionIdSchema),
  deleteDiscussionHandler
);

// --- READ ROUTES ---

// GET single discussion
router.get(
    "/:id", 
    ...getCacheStack(DISCUSSION_CACHE_BASE, { param: 'id' }, discussionIdSchema),
    getDiscussionHandler
);

// GET all discussions for a lecture
router.get(
    "/lecture/:lectureId", 
    ...getCacheStack(`${DISCUSSION_CACHE_BASE}:lectureId`, { param: 'lectureId', isList: true }, getLectureDiscussionsSchema),
    getLectureDiscussionsHandler
);

// GET all discussions for a course
router.get(
    "/course/:courseId", 
    ...getCacheStack(`${DISCUSSION_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, getCourseDiscussionsSchema),
    getCourseDiscussionsHandler
);

// GET user's discussions (authenticated user)
router.get(
    "/user/me", 
    ...getCacheStack(`${DISCUSSION_CACHE_BASE}:user`, { param: 'user', isList: true }, getUserDiscussionsSchema),
    getUserDiscussionsHandler
);

export default router;
