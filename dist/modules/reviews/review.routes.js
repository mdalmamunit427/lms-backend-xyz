"use strict";
// src/modules/reviews/review.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("./review.controller");
const review_validation_1 = require("./review.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const enrollment_middleware_1 = require("../../middlewares/enrollment.middleware");
const router = (0, express_1.Router)();
const REVIEW_CACHE_BASE = 'reviews';
// --- MUTATION ROUTES ---
// POST new review
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('review:create', review_validation_1.createReviewSchema), enrollment_middleware_1.requireEnrollmentForCourseBody, review_controller_1.createReviewHandler);
// PATCH update review 
router.patch("/:id", ...(0, middlewareStacks_1.getMutationStack)('review:update', review_validation_1.updateReviewSchema, review_validation_1.reviewIdSchema), review_controller_1.updateReviewHandler);
// DELETE review
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('review:delete', review_validation_1.reviewIdSchema), review_controller_1.deleteReviewHandler);
// --- READ ROUTES ---
// GET single review
router.get("/:id", ...(0, middlewareStacks_1.getCacheStack)(REVIEW_CACHE_BASE, { param: 'id' }, review_validation_1.reviewIdSchema), review_controller_1.getReviewHandler);
// GET all reviews for a course
router.get("/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`${REVIEW_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, review_validation_1.getCourseReviewsSchema), review_controller_1.getCourseReviewsHandler);
// GET course review statistics
router.get("/stats/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`review-stats:courseId`, { param: 'courseId' }, review_validation_1.getCourseReviewStatsSchema), review_controller_1.getCourseReviewStatsHandler);
// GET user's reviews (authenticated user)
router.get("/user/me", ...(0, middlewareStacks_1.getCacheStack)(`${REVIEW_CACHE_BASE}:user`, { param: 'user', isList: true }, review_validation_1.getUserReviewsSchema), review_controller_1.getUserReviewsHandler);
exports.default = router;
//# sourceMappingURL=review.routes.js.map