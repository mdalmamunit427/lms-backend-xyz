// src/modules/lectures/lecture.routes.ts (OPTIMIZED)

import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
import {
  createLectureHandler,
  updateLectureHandler,
  deleteLectureHandler,
  getLectureHandler,
  getLecturesByChapterHandler,
  reorderLecturesHandler,
} from "./lecture.controller";
import { chapterIdSchema, createLectureSchema, lectureIdSchema, reorderLecturesSchema, updateLectureSchema } from "./lecture.validation";

const router = Router();
const LECTURE_CACHE_BASE = 'lectures';

// POST new lecture
router.post(
  "/", 
  isAuthenticated,
    rbac('lecture:create'),
    validate(createLectureSchema), 
  createLectureHandler
);

// PATCH update lecture 
router.patch(
  "/:id", 
  isAuthenticated,
    rbac('lecture:update'),
    validate(lectureIdSchema),
    validate(updateLectureSchema), 
  updateLectureHandler
);

// DELETE lecture (Transactional cascading delete)
router.delete(
  "/:id", 
  isAuthenticated,
    rbac('lecture:delete'),
    validate(lectureIdSchema),
  deleteLectureHandler
);

// POST Reorder lectures within a chapter
router.post(
  "/reorder", 
 isAuthenticated,
    rbac('lecture:update'),
    validate(reorderLecturesSchema),
  reorderLecturesHandler
);

// GET single lecture (Public view)
router.get(
    "/:id", 
    isAuthenticated,
    cacheMiddleware(LECTURE_CACHE_BASE, { param: 'id' }),
    validate(lectureIdSchema),
    getLectureHandler
);

// GET all lectures for a chapter (List view)
router.get(
    "/chapter/:chapterId", 
    isAuthenticated,
    cacheMiddleware(`${LECTURE_CACHE_BASE}:chapterId`, { param: 'chapterId' }),
    validate(chapterIdSchema),
    getLecturesByChapterHandler
);

export default router;