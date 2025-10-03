// src/modules/chapters/chapter.validation.ts

import { z } from 'zod';

// Base Zod validator for MongoDB ObjectId format
const objectIdSchema = z.string()
  .nonempty('ID is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format. Must be a 24-character ObjectId.');

// Schema for Lecture data embedded in transactional creation
const lectureDataSchema = z.object({
  title: z.string().nonempty("Lecture title is required").min(3, "Title too short"),
  videoUrl: z.string().nonempty("Video URL is required").url("Invalid URL format"),
  duration: z.number().int("Duration must be an integer").min(1, "Duration is required"), 
  isPreview: z.boolean().optional(),
  resources: z.string().url("Resource URL must be a valid URL.").optional(),
});

// Create Chapter
export const createChapterSchema = z.object({
  body: z.object({
    title: z.string().nonempty("Title is required").min(3, "Title too short"),
    course: objectIdSchema.describe("Course ID is required"),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
  }),
});

// Create Chapter With Lectures (Transactional)
export const createChapterWithLecturesSchema = z.object({
  body: z.object({
    chapter: z.object({
      title: z.string().nonempty("Title is required").min(3, "Title too short"),
      course: objectIdSchema.describe("Course ID is required"),
      order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    }),
    lectures: z.array(lectureDataSchema)
      .min(1, "At least one lecture is required")
      .max(50, "Maximum 50 lectures per creation batch"),
  }),
});

// Update Chapter
export const updateChapterSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title too short").optional(),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
  }),
});

// Get Chapter / Update Chapter / Delete Chapter (ID in params)
export const getChapterSchema = z.object({
  params: z.object({
    id: objectIdSchema.describe("Chapter ID is required"), // Expects 'id'
  }),
});

export const getCourseChaptersSchema = z.object({
  params: z.object({
    // Correctly matches the route parameter name
    courseId: objectIdSchema.describe("Course ID is required"),
  }),
});

// Reorder Chapters with Lectures
export const reorderChaptersWithLecturesSchema = z.object({
  body: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
    order: z.array(
      z.object({
        chapterId: objectIdSchema.describe("Chapter ID is required"),
        order: z.number().int("Order must be an integer").min(1, "Order must be >=1"),
        lectures: z.array(
          z.object({
            lectureId: objectIdSchema.describe("Lecture ID is required"),
            order: z.number().int("Order must be an integer").min(1, "Order must be >=1"),
          })
        ).optional().default([]),
      })
    ).min(1, "At least one chapter must be reordered"),
  }),
});

// Schema for bulk chapter operations
export const bulkUpdateChaptersSchema = z.object({
  body: z.object({
    courseId: objectIdSchema.describe("Course ID is required"),
    chapters: z.array(
      z.object({
        id: objectIdSchema.describe("Chapter ID is required"),
        title: z.string().min(3, "Title too short").optional(),
        order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
      })
    ).min(1, "At least one chapter must be provided"),
  }),
});
