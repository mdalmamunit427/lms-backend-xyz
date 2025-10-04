"use strict";
// src/modules/quizes/quiz.validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizResultsSchema = exports.submitQuizAttemptSchema = exports.quizIdSchema = exports.updateQuizSchema = exports.createQuizSchema = void 0;
const zod_1 = require("zod");
// Base Zod validator for MongoDB ObjectId format
const objectIdSchema = zod_1.z.string()
    .nonempty('ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format. Must be a 24-character ObjectId.');
// Schema for quiz question
const questionSchema = zod_1.z.object({
    question: zod_1.z.string().nonempty("Question text is required").min(10, "Question too short"),
    options: zod_1.z.array(zod_1.z.string().nonempty("Option cannot be empty"))
        .min(2, "At least 2 options required")
        .max(6, "Maximum 6 options allowed"),
    correctAnswer: zod_1.z.number().int("Correct answer must be an integer").min(0, "Invalid answer index"),
    type: zod_1.z.string().optional(),
    points: zod_1.z.number().int("Points must be an integer").min(1, "Points must be at least 1").optional(),
    explanation: zod_1.z.string().optional(),
});
// Create Quiz Schema
exports.createQuizSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Support both lecture-based and course/chapter-based formats
        lecture: objectIdSchema.describe("Lecture ID is required").optional(),
        course: objectIdSchema.describe("Course ID is required").optional(),
        chapter: objectIdSchema.describe("Chapter ID is required").optional(),
        title: zod_1.z.string().nonempty("Quiz title is required").min(3, "Title too short"),
        description: zod_1.z.string().optional(),
        questions: zod_1.z.array(questionSchema)
            .min(1, "At least one question is required")
            .max(50, "Maximum 50 questions per quiz"),
        totalPoints: zod_1.z.number().int("Total points must be an integer").min(1, "Total points must be at least 1").optional(),
        timeLimit: zod_1.z.number().int("Time limit must be an integer").min(1, "Time limit must be at least 1 minute").optional(),
        passingScore: zod_1.z.number().min(0, "Passing score must be at least 0").max(100, "Passing score cannot exceed 100").optional(),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    }).refine((data) => {
        // Either lecture OR (course AND chapter) must be provided
        return (data.lecture && !data.course && !data.chapter) ||
            (!data.lecture && data.course && data.chapter);
    }, {
        message: "Either lecture ID or both course and chapter IDs must be provided"
    }),
});
// Update Quiz Schema
exports.updateQuizSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, "Title too short").optional(),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
        questions: zod_1.z.array(questionSchema)
            .min(1, "At least one question is required")
            .max(50, "Maximum 50 questions per quiz")
            .optional(),
    }),
});
// Quiz ID Schema for params
exports.quizIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: objectIdSchema.describe("Quiz ID is required"),
    }),
});
// Submit Quiz Attempt Schema
exports.submitQuizAttemptSchema = zod_1.z.object({
    body: zod_1.z.object({
        answers: zod_1.z.array(zod_1.z.number().int("Answer must be an integer").min(0, "Invalid answer index"))
            .min(1, "At least one answer is required"),
    }),
});
// Quiz Results Schema
exports.getQuizResultsSchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: objectIdSchema.describe("Course ID is required"),
    }),
});
//# sourceMappingURL=quiz.validation.js.map