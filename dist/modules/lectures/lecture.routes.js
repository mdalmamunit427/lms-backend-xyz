"use strict";
// src/modules/lectures/lecture.routes.ts (OPTIMIZED)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const lecture_controller_1 = require("./lecture.controller");
const lecture_validation_1 = require("./lecture.validation");
const router = (0, express_1.Router)();
const LECTURE_CACHE_BASE = 'lectures';
// POST new lecture
router.post("/", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('lecture:create'), (0, validate_middleware_1.validate)(lecture_validation_1.createLectureSchema), lecture_controller_1.createLectureHandler);
// PATCH update lecture 
router.patch("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('lecture:update'), (0, validate_middleware_1.validate)(lecture_validation_1.lectureIdSchema), (0, validate_middleware_1.validate)(lecture_validation_1.updateLectureSchema), lecture_controller_1.updateLectureHandler);
// DELETE lecture (Transactional cascading delete)
router.delete("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('lecture:delete'), (0, validate_middleware_1.validate)(lecture_validation_1.lectureIdSchema), lecture_controller_1.deleteLectureHandler);
// POST Reorder lectures within a chapter
router.post("/reorder", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('lecture:update'), (0, validate_middleware_1.validate)(lecture_validation_1.reorderLecturesSchema), lecture_controller_1.reorderLecturesHandler);
// GET single lecture (Public view)
router.get("/:id", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(LECTURE_CACHE_BASE, { param: 'id' }), (0, validate_middleware_1.validate)(lecture_validation_1.lectureIdSchema), lecture_controller_1.getLectureHandler);
// GET all lectures for a chapter (List view)
router.get("/chapter/:chapterId", auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${LECTURE_CACHE_BASE}:chapterId`, { param: 'chapterId' }), (0, validate_middleware_1.validate)(lecture_validation_1.chapterIdSchema), lecture_controller_1.getLecturesByChapterHandler);
exports.default = router;
//# sourceMappingURL=lecture.routes.js.map