"use strict";
// src/modules/discussions/discussion.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discussion_controller_1 = require("./discussion.controller");
const discussion_validation_1 = require("./discussion.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const enrollment_middleware_1 = require("../../middlewares/enrollment.middleware");
const router = (0, express_1.Router)();
const DISCUSSION_CACHE_BASE = 'discussions';
// --- MUTATION ROUTES ---
// POST new discussion
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('discussion:create', discussion_validation_1.createDiscussionSchema), enrollment_middleware_1.requireEnrollmentForLectureBody, discussion_controller_1.createDiscussionHandler);
// POST answer to discussion
router.post("/:id/answer", ...(0, middlewareStacks_1.getMutationStack)('discussion:update', discussion_validation_1.answerDiscussionSchema, discussion_validation_1.discussionIdSchema), enrollment_middleware_1.requireEnrollmentForDiscussionParam, discussion_controller_1.answerDiscussionHandler);
// PATCH update discussion 
router.patch("/:id", ...(0, middlewareStacks_1.getMutationStack)('discussion:update', discussion_validation_1.updateDiscussionSchema, discussion_validation_1.discussionIdSchema), discussion_controller_1.updateDiscussionHandler);
// DELETE discussion
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('discussion:delete', discussion_validation_1.discussionIdSchema), discussion_controller_1.deleteDiscussionHandler);
// --- READ ROUTES ---
// GET single discussion
router.get("/:id", ...(0, middlewareStacks_1.getCacheStack)(DISCUSSION_CACHE_BASE, { param: 'id' }, discussion_validation_1.discussionIdSchema), discussion_controller_1.getDiscussionHandler);
// GET all discussions for a lecture
router.get("/lecture/:lectureId", ...(0, middlewareStacks_1.getCacheStack)(`${DISCUSSION_CACHE_BASE}:lectureId`, { param: 'lectureId', isList: true }, discussion_validation_1.getLectureDiscussionsSchema), discussion_controller_1.getLectureDiscussionsHandler);
// GET all discussions for a course
router.get("/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`${DISCUSSION_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, discussion_validation_1.getCourseDiscussionsSchema), discussion_controller_1.getCourseDiscussionsHandler);
// GET user's discussions (authenticated user)
router.get("/user/me", ...(0, middlewareStacks_1.getCacheStack)(`${DISCUSSION_CACHE_BASE}:user`, { param: 'user', isList: true }, discussion_validation_1.getUserDiscussionsSchema), discussion_controller_1.getUserDiscussionsHandler);
exports.default = router;
//# sourceMappingURL=discussion.routes.js.map