// src/modules/progress/progress.validation.ts

import { z } from 'zod';

// Base Zod validator for MongoDB ObjectId format
const objectIdSchema = z.string()
  .nonempty('ID is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format. Must be a 24-character ObjectId.');

// Update Lecture Progress Schema
export const updateLectureProgressSchema = z.object({
  params: z.object({
    lectureId: objectIdSchema.describe("Lecture ID is required"),
  }),
  body: z.object({
    progressPercentage: z.number()
      .min(0, "Progress must be at least 0%")
      .max(1, "Progress cannot exceed 100%"),
  }),
});

// Get Course Progress Schema
export const getCourseProgressSchema = z.object({
  params: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
  }),
});

// Get User Dashboard Schema (uses authenticated user)
export const getUserDashboardSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }).optional(),
});

// Get Course Completion Stats Schema
export const getCourseCompletionStatsSchema = z.object({
  params: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
  }),
});


// Type exports
export type IUpdateLectureProgressBody = z.infer<typeof updateLectureProgressSchema>['body'];
export type IUpdateLectureProgressParams = z.infer<typeof updateLectureProgressSchema>['params'];
