// src/modules/chapters/chapter.routes.ts (OPTIMIZED)

import { Router } from "express";
import {
  createChapterHandler,
  createChapterWithLecturesHandler,
  getChaptersHandler,
  getChapterHandler,
  reorderChaptersWithLecturesHandler,
  updateChapterHandler,
  deleteChapterHandler,
} from "./chapter.controller";
import {
  createChapterSchema,
  createChapterWithLecturesSchema,
  updateChapterSchema,
  getChapterSchema, 
  reorderChaptersWithLecturesSchema,
  getCourseChaptersSchema,
} from "./chapter.validation";
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";

const router = Router();
const CHAPTER_CACHE_BASE = 'chapters';

// --- MUTATION ROUTES (Concise Stacks) ---

// POST new chapter
router.post(
  "/", 
  ...getMutationStack('chapter:create', createChapterSchema), 
  createChapterHandler
);

// POST new chapter with associated lectures (Transactional)
router.post(
  "/with-lectures", 
  ...getMutationStack('chapter:create', createChapterWithLecturesSchema), 
  createChapterWithLecturesHandler
);

// PATCH update chapter (Title or Order)
router.patch(
  "/:id", 
  ...getMutationStack('chapter:update', updateChapterSchema), 
  updateChapterHandler
);

// DELETE chapter (Transactional cascading delete)
router.delete(
  "/:id", 
  ...getDeleteStack('chapter:delete', getChapterSchema), // getChapterSchema validates params.id
  deleteChapterHandler 
);

// POST Reorder chapters and lectures (Transactional)
router.post(
  "/reorder-with-lectures", 
  ...getMutationStack('chapter:update', reorderChaptersWithLecturesSchema), 
  reorderChaptersWithLecturesHandler
);


// GET all chapters for a course (List route)
router.get(
    "/course/:courseId", 
    // FIX APPLIED: Using the schema that correctly matches 'courseId'
    ...getCacheStack(`${CHAPTER_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }, getCourseChaptersSchema),
    getChaptersHandler
);

// GET single chapter by ID (Remains Correct)
router.get(
    "/:id", 
    // This correctly uses getChapterSchema because the param is 'id'
    ...getCacheStack(CHAPTER_CACHE_BASE, { param: 'id' }, getChapterSchema),
    getChapterHandler
);
export default router;