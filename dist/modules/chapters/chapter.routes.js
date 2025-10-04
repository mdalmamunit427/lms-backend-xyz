"use strict";
// src/modules/chapters/chapter.routes.ts (OPTIMIZED)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const chapter_controller_1 = require("./chapter.controller");
const chapter_validation_1 = require("./chapter.validation");
const router = (0, express_1.Router)();
const CHAPTER_CACHE_BASE = 'chapters';
// --- MUTATION ROUTES (Concise Stacks) ---
// POST new chapter
router.post("/", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('chapter:create'), (0, validate_middleware_1.validate)(chapter_validation_1.createChapterSchema), chapter_controller_1.createChapterHandler);
// POST new chapter with associated lectures (Transactional)
router.post("/with-lectures", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('chapter:create'), (0, validate_middleware_1.validate)(chapter_validation_1.createChapterWithLecturesSchema), chapter_controller_1.createChapterWithLecturesHandler);
// PATCH update chapter (Title or Order)
router.patch("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('chapter:update'), (0, validate_middleware_1.validate)(chapter_validation_1.updateChapterSchema), chapter_controller_1.updateChapterHandler);
// DELETE chapter (Transactional cascading delete)
router.delete("/:id", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('chapter:delete'), (0, validate_middleware_1.validate)(chapter_validation_1.getChapterSchema), // getChapterSchema validates params.id
chapter_controller_1.deleteChapterHandler);
// POST Reorder chapters and lectures (Transactional)
router.post("/reorder-with-lectures", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('chapter:update'), (0, validate_middleware_1.validate)(chapter_validation_1.reorderChaptersWithLecturesSchema), chapter_controller_1.reorderChaptersWithLecturesHandler);
// GET all chapters for a course (List route)
router.get("/course/:courseId", 
// FIX APPLIED: Using the schema that correctly matches 'courseId'
auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(`${CHAPTER_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }), (0, validate_middleware_1.validate)(chapter_validation_1.getCourseChaptersSchema), chapter_controller_1.getChaptersHandler);
// GET single chapter by ID (Remains Correct)
router.get("/:id", 
// This correctly uses getChapterSchema because the param is 'id'
auth_1.isAuthenticated, (0, cacheMiddleware_1.cacheMiddleware)(CHAPTER_CACHE_BASE, { param: 'id' }), (0, validate_middleware_1.validate)(chapter_validation_1.getChapterSchema), chapter_controller_1.getChapterHandler);
exports.default = router;
//# sourceMappingURL=chapter.routes.js.map