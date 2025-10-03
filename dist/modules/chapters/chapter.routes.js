"use strict";
// src/modules/chapters/chapter.routes.ts (OPTIMIZED)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chapter_controller_1 = require("./chapter.controller");
const chapter_validation_1 = require("./chapter.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const router = (0, express_1.Router)();
const CHAPTER_CACHE_BASE = 'chapters';
// --- MUTATION ROUTES (Concise Stacks) ---
// POST new chapter
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('chapter:create', chapter_validation_1.createChapterSchema), chapter_controller_1.createChapterHandler);
// POST new chapter with associated lectures (Transactional)
router.post("/with-lectures", ...(0, middlewareStacks_1.getMutationStack)('chapter:create', chapter_validation_1.createChapterWithLecturesSchema), chapter_controller_1.createChapterWithLecturesHandler);
// PATCH update chapter (Title or Order)
router.patch("/:id", ...(0, middlewareStacks_1.getMutationStack)('chapter:update', chapter_validation_1.updateChapterSchema), chapter_controller_1.updateChapterHandler);
// DELETE chapter (Transactional cascading delete)
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('chapter:delete', chapter_validation_1.getChapterSchema), // getChapterSchema validates params.id
chapter_controller_1.deleteChapterHandler);
// POST Reorder chapters and lectures (Transactional)
router.post("/reorder-with-lectures", ...(0, middlewareStacks_1.getMutationStack)('chapter:update', chapter_validation_1.reorderChaptersWithLecturesSchema), chapter_controller_1.reorderChaptersWithLecturesHandler);
// GET all chapters for a course (List route)
router.get("/course/:courseId", 
// FIX APPLIED: Using the schema that correctly matches 'courseId'
...(0, middlewareStacks_1.getCacheStack)(`${CHAPTER_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, chapter_validation_1.getCourseChaptersSchema), chapter_controller_1.getChaptersHandler);
// GET single chapter by ID (Remains Correct)
router.get("/:id", 
// This correctly uses getChapterSchema because the param is 'id'
...(0, middlewareStacks_1.getCacheStack)(CHAPTER_CACHE_BASE, { param: 'id' }, chapter_validation_1.getChapterSchema), chapter_controller_1.getChapterHandler);
exports.default = router;
//# sourceMappingURL=chapter.routes.js.map