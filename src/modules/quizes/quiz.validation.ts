// src/modules/quizes/quiz.validation.ts

import { z } from 'zod';

// Base Zod validator for MongoDB ObjectId format
const objectIdSchema = z.string()
  .nonempty('ID is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format. Must be a 24-character ObjectId.');

// Schema for quiz question
const questionSchema = z.object({
  question: z.string().nonempty("Question text is required").min(10, "Question too short"),
  options: z.array(z.string().nonempty("Option cannot be empty"))
    .min(2, "At least 2 options required")
    .max(6, "Maximum 6 options allowed"),
  correctAnswer: z.number().int("Correct answer must be an integer").min(0, "Invalid answer index"),
  type: z.string().optional(),
  points: z.number().int("Points must be an integer").min(1, "Points must be at least 1").optional(),
  explanation: z.string().optional(),
});

// Create Quiz Schema
export const createQuizSchema = z.object({
  body: z.object({
    // Support both lecture-based and course/chapter-based formats
    lecture: objectIdSchema.describe("Lecture ID is required").optional(),
    course: objectIdSchema.describe("Course ID is required").optional(),
    chapter: objectIdSchema.describe("Chapter ID is required").optional(),
    title: z.string().nonempty("Quiz title is required").min(3, "Title too short"),
    description: z.string().optional(),
    questions: z.array(questionSchema)
      .min(1, "At least one question is required")
      .max(50, "Maximum 50 questions per quiz"),
    totalPoints: z.number().int("Total points must be an integer").min(1, "Total points must be at least 1").optional(),
    timeLimit: z.number().int("Time limit must be an integer").min(1, "Time limit must be at least 1 minute").optional(),
    passingScore: z.number().min(0, "Passing score must be at least 0").max(100, "Passing score cannot exceed 100").optional(),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
  }).refine((data) => {
    // Either lecture OR (course AND chapter) must be provided
    return (data.lecture && !data.course && !data.chapter) || 
           (!data.lecture && data.course && data.chapter);
  }, {
    message: "Either lecture ID or both course and chapter IDs must be provided"
  }),
});

// Update Quiz Schema
export const updateQuizSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title too short").optional(),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    questions: z.array(questionSchema)
      .min(1, "At least one question is required")
      .max(50, "Maximum 50 questions per quiz")
      .optional(),
  }),
});

// Quiz ID Schema for params
export const quizIdSchema = z.object({
  params: z.object({
    id: objectIdSchema.describe("Quiz ID is required"),
  }),
});

// Chapter ID Schema for listing quizzes
export const getChapterQuizzesSchema = z.object({
  params: z.object({
    chapterId: objectIdSchema.describe("Chapter ID is required"),
  }),
});

// Course ID Schema for listing quizzes
export const getCourseQuizzesSchema = z.object({
  params: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
  }),
});

// Submit Quiz Attempt Schema
export const submitQuizAttemptSchema = z.object({
  body: z.object({
    answers: z.array(z.number().int("Answer must be an integer").min(0, "Invalid answer index"))
      .min(1, "At least one answer is required"),
  }),
});

// Quiz Results Schema
export const getQuizResultsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
  }),
});

// Type exports
export type ICreateQuizBody = z.infer<typeof createQuizSchema>['body'];
export type IUpdateQuizBody = z.infer<typeof updateQuizSchema>['body'];
export type ISubmitQuizAttemptBody = z.infer<typeof submitQuizAttemptSchema>['body'];
