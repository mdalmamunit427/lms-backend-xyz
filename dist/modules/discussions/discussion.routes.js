"use strict";
// src/modules/discussions/discussion.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const discussion_controller_1 = require("./discussion.controller");
const discussion_validation_1 = require("./discussion.validation");
const router = (0, express_1.Router)();
const DISCUSSION_CACHE_BASE = 'discussions';
// --- MUTATION ROUTES ---
// POST new discussion
router.post("/", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('discussion:create'), (0, validate_middleware_1.validate)(discussion_validation_1.createDiscussionSchema), discussion_controller_1.createDiscussionHandler);
// POST answer to discussion
router.post("/:id/answer", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('discussion:answer'), (0, validate_middleware_1.validate)(discussion_validation_1.discussionIdSchema), (0, validate_middleware_1.validate)(discussion_validation_1.answerDiscussionSchema), discussion_controller_1.answerDiscussionHandler);
// PATCH update discussion 
router.patch("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('discussion:update'), (0, validate_middleware_1.validate)(discussion_validation_1.discussionIdSchema), (0, validate_middleware_1.validate)(discussion_validation_1.updateDiscussionSchema), discussion_controller_1.updateDiscussionHandler);
// DELETE discussion
router.delete("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('discussion:delete'), (0, validate_middleware_1.validate)(discussion_validation_1.discussionIdSchema), discussion_controller_1.deleteDiscussionHandler);
// --- READ ROUTES ---
// GET single discussion
router.get("/:id", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(DISCUSSION_CACHE_BASE, { param: 'id' }), (0, validate_middleware_1.validate)(discussion_validation_1.discussionIdSchema), discussion_controller_1.getDiscussionHandler);
// GET all discussions for a lecture
router.get("/lecture/:lectureId", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${DISCUSSION_CACHE_BASE}:lectureId`, { param: 'lectureId', isList: true }), (0, validate_middleware_1.validate)(discussion_validation_1.getLectureDiscussionsSchema), discussion_controller_1.getLectureDiscussionsHandler);
// GET all discussions for a course
router.get("/course/:courseId", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${DISCUSSION_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }), (0, validate_middleware_1.validate)(discussion_validation_1.getCourseDiscussionsSchema), discussion_controller_1.getCourseDiscussionsHandler);
// GET user's discussions (authenticated user)
router.get("/user/me", auth_1.isAuthenticated, (0, validate_middleware_1.validate)(discussion_validation_1.getUserDiscussionsSchema), discussion_controller_1.getUserDiscussionsHandler);
exports.default = router;
//# sourceMappingURL=discussion.routes.js.map