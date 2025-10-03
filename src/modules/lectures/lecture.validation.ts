// src/modules/lectures/lecture.validation.ts

import { z } from "zod";

// Base Zod validator for MongoDB ObjectId format
const hexRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string()
  .trim()
  .refine(val => {
      return val.length === 24 && hexRegex.test(val);
  }, { 
      message: "Invalid ID format. Must be a 24-character ObjectId." 
  });

// 1. Create Lecture Schema
export const createLectureSchema = z.object({
  body: z.object({
    title: z.string().nonempty("Lecture title is required").min(3, "Title is too short."),
    course: objectIdSchema.describe("Course ID is required"),
    chapter: objectIdSchema.describe("Chapter ID is required"),
    videoUrl: z.string().nonempty("Video URL is required").url("Invalid URL format."),
    duration: z.number().int("Duration must be an integer").min(1, "Duration must be at least 1 second."),
    isPreview: z.boolean().optional(),
    resources: z.string().url("Resource URL must be a valid URL.").optional(),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
  }),
});

// 2. Update Lecture Schema
export const updateLectureSchema = z.object({
  body: z.object({
    title: z.string().nonempty("Title is required").min(3, "Title is too short.").optional(),
    videoUrl: z.string().nonempty("Video URL is required").url("Invalid URL format.").optional(),
    duration: z.number().int("Duration must be an integer").min(1, "Duration must be at least 1 second.").optional(),
    order: z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    isPreview: z.boolean().optional(),
    resources: z.string().url("Resource URL must be a valid URL.").optional().nullable(), // Allow null to remove
  }),
});

// 3. ID Validation Schema for params
export const lectureIdSchema = z.object({
  params: z.object({
    id: objectIdSchema.describe("Lecture ID is required"),
  }),
});

// 4. Chapter ID Validation for list views
export const chapterIdSchema = z.object({
  params: z.object({
    chapterId: objectIdSchema.describe("Chapter ID is required"),
  }),
});

export const reorderLecturesSchema = z.object({
  body: z.object({
    // FIX: We must include chapterId as it is in the payload and required by the service
    chapterId: objectIdSchema.describe("Chapter ID is required"),
    
    order: z.array(
      z.object({
        lectureId: objectIdSchema.describe("Lecture ID is required"),
        order: z.number().int().min(1, "Order must be >=1"),
      })
    ).min(1, "At least one lecture must be reordered"),
  })
});


export type ICreateLectureBody = z.infer<typeof createLectureSchema>['body'];
export type IUpdateLectureBody = z.infer<typeof updateLectureSchema>['body'];
