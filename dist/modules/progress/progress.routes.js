"use strict";
// src/modules/progress/progress.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_controller_1 = require("./progress.controller");
const progress_validation_1 = require("./progress.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const auth_1 = require("../../middlewares/auth");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const enrollment_middleware_1 = require("../../middlewares/enrollment.middleware");
const router = (0, express_1.Router)();
const PROGRESS_CACHE_BASE = 'progress';
// --- MUTATION ROUTES ---
// POST update lecture progress
router.post("/lecture/:lectureId", ...(0, middlewareStacks_1.getMutationStack)('progress:update', progress_validation_1.updateLectureProgressSchema), enrollment_middleware_1.requireEnrollmentForLectureParam, progress_controller_1.updateLectureProgressHandler);
// --- READ ROUTES ---
// GET user dashboard (overview of all courses)
router.get("/dashboard", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${PROGRESS_CACHE_BASE}:dashboard`), progress_controller_1.getUserDashboardHandler);
// GET course progress for specific course
router.get("/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`${PROGRESS_CACHE_BASE}:courseId`, { param: 'courseId' }, progress_validation_1.getCourseProgressSchema), progress_controller_1.getCourseProgressHandler);
// GET course completion statistics (instructor/admin only)
router.get("/stats/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`progress-stats:courseId`, { param: 'courseId' }, progress_validation_1.getCourseCompletionStatsSchema), progress_controller_1.getCourseCompletionStatsHandler);
exports.default = router;
//# sourceMappingURL=progress.routes.js.map