"use strict";
// src/modules/reviews/review.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("./review.controller");
const review_validation_1 = require("./review.validation");
const auth_1 = require("../../middlewares/auth");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const router = (0, express_1.Router)();
const REVIEW_CACHE_BASE = 'reviews';
// --- MUTATION ROUTES ---
// POST new review
router.post("/", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('review:create'), (0, validate_middleware_1.validate)(review_validation_1.createReviewSchema), review_controller_1.createReviewHandler);
// PATCH update review 
router.patch("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('review:update'), (0, validate_middleware_1.validate)(review_validation_1.reviewIdSchema), (0, validate_middleware_1.validate)(review_validation_1.updateReviewSchema), review_controller_1.updateReviewHandler);
// DELETE review
router.delete("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('review:delete'), (0, validate_middleware_1.validate)(review_validation_1.reviewIdSchema), review_controller_1.deleteReviewHandler);
// --- READ ROUTES ---
// GET single review
router.get("/:id", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(REVIEW_CACHE_BASE, { param: 'id' }), (0, validate_middleware_1.validate)(review_validation_1.reviewIdSchema), review_controller_1.getReviewHandler);
// GET all reviews for a course
router.get("/course/:courseId", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${REVIEW_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }), (0, validate_middleware_1.validate)(review_validation_1.getCourseReviewsSchema), review_controller_1.getCourseReviewsHandler);
// GET course review statistics
router.get("/stats/course/:courseId", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`review-stats:courseId`, { param: 'courseId' }), (0, validate_middleware_1.validate)(review_validation_1.getCourseReviewStatsSchema), review_controller_1.getCourseReviewStatsHandler);
// GET user's reviews (authenticated user)
router.get("/user/me", auth_1.isAuthenticated, (0, validate_middleware_1.validate)(review_validation_1.getUserReviewsSchema), review_controller_1.getUserReviewsHandler);
exports.default = router;
//# sourceMappingURL=review.routes.js.map