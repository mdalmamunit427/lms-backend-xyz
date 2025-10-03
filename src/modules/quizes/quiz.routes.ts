// src/modules/quizes/quiz.routes.ts

import { Router } from "express";
import {
  createQuizHandler,
  updateQuizHandler,
  deleteQuizHandler,
  getQuizHandler,
  getQuizzesByChapterHandler,
  getCourseQuizzesHandler,
  submitQuizAttemptHandler,
  getQuizResultsHandler,
} from "./quiz.controller";
import {
  createQuizSchema,
  updateQuizSchema,
  quizIdSchema,
  getChapterQuizzesSchema,
  getCourseQuizzesSchema,
  submitQuizAttemptSchema,
  getQuizResultsSchema,
} from "./quiz.validation";
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";
import { isAuthenticated } from "../../middlewares/auth";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
import { validate } from "../../middlewares/validate.middleware";
import { requireEnrollmentForQuizParam } from "../../middlewares/enrollment.middleware";

const router = Router();
const QUIZ_CACHE_BASE = 'quizzes';

// --- MUTATION ROUTES ---

// POST new quiz
router.post(
  "/", 
  ...getMutationStack('quiz:create', createQuizSchema), 
  createQuizHandler
);

// PATCH update quiz 
router.patch(
  "/:id", 
  ...getMutationStack('quiz:update', updateQuizSchema, quizIdSchema), 
  updateQuizHandler
);

// DELETE quiz
router.delete(
  "/:id", 
  ...getDeleteStack('quiz:delete', quizIdSchema),
  deleteQuizHandler
);

// POST submit quiz attempt
router.post(
  "/:id/submit", 
  ...getMutationStack('quiz:submit', submitQuizAttemptSchema, quizIdSchema), 
  requireEnrollmentForQuizParam,
  submitQuizAttemptHandler
);

// --- READ ROUTES ---

// GET single quiz
router.get(
    "/:id", 
    ...getCacheStack(QUIZ_CACHE_BASE, { param: 'id' }, quizIdSchema),
    getQuizHandler
);

// GET all quizzes for a chapter
router.get(
    "/chapter/:chapterId", 
    ...getCacheStack(`${QUIZ_CACHE_BASE}:chapterId`, { param: 'chapterId' }, getChapterQuizzesSchema),
    getQuizzesByChapterHandler
);

// GET all quizzes for a course
router.get(
    "/course/:courseId", 
    ...getCacheStack(`${QUIZ_CACHE_BASE}:courseId`, { param: 'courseId' }, getCourseQuizzesSchema),
    getCourseQuizzesHandler
);

// GET quiz results for a course
router.get(
    "/results/course/:courseId", 
    isAuthenticated,
    validate(getQuizResultsSchema),
    cacheMiddleware(`quiz-results:courseId`, { param: 'courseId' }),
    getQuizResultsHandler
);

export default router;
