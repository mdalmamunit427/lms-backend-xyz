// src/modules/lectures/lecture.routes.ts (OPTIMIZED)

import { Router } from "express";
import {
  createLectureHandler,
  updateLectureHandler,
  deleteLectureHandler,
  getLectureHandler,
  getLecturesByChapterHandler,
  reorderLecturesHandler,
} from "./lecture.controller";
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";
import { chapterIdSchema, createLectureSchema, lectureIdSchema, reorderLecturesSchema, updateLectureSchema } from "./lecture.validation";

const router = Router();
const LECTURE_CACHE_BASE = 'lectures';

// --- MUTATION ROUTES (Concise Stacks) ---

// POST new lecture
router.post(
  "/", 
  ...getMutationStack('lecture:create', createLectureSchema), 
  createLectureHandler
);

// PATCH update lecture 
router.patch(
  "/:id", 
  ...getMutationStack('lecture:update', updateLectureSchema, lectureIdSchema), 
  updateLectureHandler
);

// DELETE lecture (Transactional cascading delete)
router.delete(
  "/:id", 
  ...getDeleteStack('lecture:delete', lectureIdSchema),
  deleteLectureHandler
);

// POST Reorder lectures within a chapter
router.post(
  "/reorder", 
 ...getMutationStack('lecture:update', reorderLecturesSchema),
  reorderLecturesHandler
);


// --- READ ROUTES (Concise Stacks) ---

// GET single lecture (Public view)
router.get(
    "/:id", 
    ...getCacheStack(LECTURE_CACHE_BASE, { param: 'id' }, lectureIdSchema),
    getLectureHandler
);

// GET all lectures for a chapter (List view)
router.get(
    "/chapter/:chapterId", 
    ...getCacheStack(`${LECTURE_CACHE_BASE}:chapterId`, { param: 'chapterId' }, chapterIdSchema),
    getLecturesByChapterHandler
);

export default router;