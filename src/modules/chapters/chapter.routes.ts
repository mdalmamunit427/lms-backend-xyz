// src/modules/chapters/chapter.routes.ts (OPTIMIZED)

import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
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

const router = Router();
const CHAPTER_CACHE_BASE = 'chapters';

// --- MUTATION ROUTES (Concise Stacks) ---

// POST new chapter
router.post(
  "/", 
  isAuthenticated,
    rbac('chapter:create'),
    validate(createChapterSchema), 
  createChapterHandler
);

// POST new chapter with associated lectures (Transactional)
router.post(
  "/with-lectures", 
  isAuthenticated,
    rbac('chapter:create'),
    validate(createChapterWithLecturesSchema), 
  createChapterWithLecturesHandler
);

// PATCH update chapter (Title or Order)
router.patch(
  "/:id", 
  isAuthenticated,
    rbac('chapter:update'),
    validate(updateChapterSchema), 
  updateChapterHandler
);

// DELETE chapter (Transactional cascading delete)
router.delete(
  "/:id", 
  isAuthenticated,
    rbac('chapter:delete'),
    validate(getChapterSchema), // getChapterSchema validates params.id
  deleteChapterHandler 
);

// POST Reorder chapters and lectures (Transactional)
router.post(
  "/reorder-with-lectures", 
  isAuthenticated,
    rbac('chapter:update'),
    validate(reorderChaptersWithLecturesSchema), 
  reorderChaptersWithLecturesHandler
);


// GET all chapters for a course (List route)
router.get(
    "/course/:courseId", 
    // FIX APPLIED: Using the schema that correctly matches 'courseId'
    isAuthenticated,
    cacheMiddleware(`${CHAPTER_CACHE_BASE}:courseId`, { param: 'courseId', isList: true }),
    validate(getCourseChaptersSchema),
    getChaptersHandler
);

// GET single chapter by ID (Remains Correct)
router.get(
    "/:id", 
    // This correctly uses getChapterSchema because the param is 'id'
    isAuthenticated,
    cacheMiddleware(CHAPTER_CACHE_BASE, { param: 'id' }),
    validate(getChapterSchema),
    getChapterHandler
);
export default router;