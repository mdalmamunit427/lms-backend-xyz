import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
// src/modules/quizes/quiz.routes.ts

import {
  createQuizHandler,
  updateQuizHandler,
  deleteQuizHandler,
  getQuizHandler,
  submitQuizAttemptHandler,
  getQuizResultsHandler,
} from "./quiz.controller";
import {
  createQuizSchema,
  updateQuizSchema,
  quizIdSchema,
  submitQuizAttemptSchema,
  getQuizResultsSchema,
} from "./quiz.validation";

const router = Router();
const QUIZ_CACHE_BASE = 'quizzes';

// --- MUTATION ROUTES ---

// POST new quiz
router.post(
  "/", 
  isAuthenticated,
    rbac('quiz:create'),
    validate(createQuizSchema), 
  createQuizHandler
);

// PATCH update quiz 
router.patch(
  "/:id", 
  isAuthenticated,
    rbac('quiz:update'),
    validate(quizIdSchema),
    validate(updateQuizSchema), 
  updateQuizHandler
);

// DELETE quiz
router.delete(
  "/:id", 
  isAuthenticated,
    rbac('quiz:delete'),
    validate(quizIdSchema),
  deleteQuizHandler
);

// POST submit quiz attempt
router.post(
  "/:id/submit", 
  isAuthenticated,
    rbac('quiz:submit'),
    validate(quizIdSchema),
    validate(submitQuizAttemptSchema), 
  submitQuizAttemptHandler
);

// --- READ ROUTES ---

// GET single quiz
router.get(
    "/:id", 
    isAuthenticated,
    cacheMiddleware(QUIZ_CACHE_BASE, { param: 'id' }),
    validate(quizIdSchema),
    getQuizHandler
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
