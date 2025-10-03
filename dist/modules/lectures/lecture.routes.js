"use strict";
// src/modules/lectures/lecture.routes.ts (OPTIMIZED)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lecture_controller_1 = require("./lecture.controller");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const lecture_validation_1 = require("./lecture.validation");
const router = (0, express_1.Router)();
const LECTURE_CACHE_BASE = 'lectures';
// --- MUTATION ROUTES (Concise Stacks) ---
// POST new lecture
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('lecture:create', lecture_validation_1.createLectureSchema), lecture_controller_1.createLectureHandler);
// PATCH update lecture 
router.patch("/:id", ...(0, middlewareStacks_1.getMutationStack)('lecture:update', lecture_validation_1.updateLectureSchema, lecture_validation_1.lectureIdSchema), lecture_controller_1.updateLectureHandler);
// DELETE lecture (Transactional cascading delete)
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('lecture:delete', lecture_validation_1.lectureIdSchema), lecture_controller_1.deleteLectureHandler);
// POST Reorder lectures within a chapter
router.post("/reorder", ...(0, middlewareStacks_1.getMutationStack)('lecture:update', lecture_validation_1.reorderLecturesSchema), lecture_controller_1.reorderLecturesHandler);
// --- READ ROUTES (Concise Stacks) ---
// GET single lecture (Public view)
router.get("/:id", ...(0, middlewareStacks_1.getCacheStack)(LECTURE_CACHE_BASE, { param: 'id' }, lecture_validation_1.lectureIdSchema), lecture_controller_1.getLectureHandler);
// GET all lectures for a chapter (List view)
router.get("/chapter/:chapterId", ...(0, middlewareStacks_1.getCacheStack)(`${LECTURE_CACHE_BASE}:chapterId`, { param: 'chapterId' }, lecture_validation_1.chapterIdSchema), lecture_controller_1.getLecturesByChapterHandler);
exports.default = router;
//# sourceMappingURL=lecture.routes.js.map