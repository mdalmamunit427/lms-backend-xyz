"use strict";
// src/modules/quizes/quiz.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("./quiz.controller");
const quiz_validation_1 = require("./quiz.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const auth_1 = require("../../middlewares/auth");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const enrollment_middleware_1 = require("../../middlewares/enrollment.middleware");
const router = (0, express_1.Router)();
const QUIZ_CACHE_BASE = 'quizzes';
// --- MUTATION ROUTES ---
// POST new quiz
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('quiz:create', quiz_validation_1.createQuizSchema), quiz_controller_1.createQuizHandler);
// PATCH update quiz 
router.patch("/:id", ...(0, middlewareStacks_1.getMutationStack)('quiz:update', quiz_validation_1.updateQuizSchema, quiz_validation_1.quizIdSchema), quiz_controller_1.updateQuizHandler);
// DELETE quiz
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('quiz:delete', quiz_validation_1.quizIdSchema), quiz_controller_1.deleteQuizHandler);
// POST submit quiz attempt
router.post("/:id/submit", ...(0, middlewareStacks_1.getMutationStack)('quiz:submit', quiz_validation_1.submitQuizAttemptSchema, quiz_validation_1.quizIdSchema), enrollment_middleware_1.requireEnrollmentForQuizParam, quiz_controller_1.submitQuizAttemptHandler);
// --- READ ROUTES ---
// GET single quiz
router.get("/:id", ...(0, middlewareStacks_1.getCacheStack)(QUIZ_CACHE_BASE, { param: 'id' }, quiz_validation_1.quizIdSchema), quiz_controller_1.getQuizHandler);
// GET all quizzes for a chapter
router.get("/chapter/:chapterId", ...(0, middlewareStacks_1.getCacheStack)(`${QUIZ_CACHE_BASE}:chapterId`, { param: 'chapterId' }, quiz_validation_1.getChapterQuizzesSchema), quiz_controller_1.getQuizzesByChapterHandler);
// GET all quizzes for a course
router.get("/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`${QUIZ_CACHE_BASE}:courseId`, { param: 'courseId' }, quiz_validation_1.getCourseQuizzesSchema), quiz_controller_1.getCourseQuizzesHandler);
// GET quiz results for a course
router.get("/results/course/:courseId", auth_1.isAuthenticated, (0, validate_middleware_1.validate)(quiz_validation_1.getQuizResultsSchema), (0, cacheMiddleware_1.cacheMiddleware)(`quiz-results:courseId`, { param: 'courseId' }), quiz_controller_1.getQuizResultsHandler);
exports.default = router;
//# sourceMappingURL=quiz.routes.js.map