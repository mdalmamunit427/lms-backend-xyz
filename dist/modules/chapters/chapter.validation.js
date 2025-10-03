"use strict";
// src/modules/chapters/chapter.validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateChaptersSchema = exports.reorderChaptersWithLecturesSchema = exports.getCourseChaptersSchema = exports.getChapterSchema = exports.updateChapterSchema = exports.createChapterWithLecturesSchema = exports.createChapterSchema = void 0;
const zod_1 = require("zod");
// Base Zod validator for MongoDB ObjectId format
const objectIdSchema = zod_1.z.string()
    .nonempty('ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format. Must be a 24-character ObjectId.');
// Schema for Lecture data embedded in transactional creation
const lectureDataSchema = zod_1.z.object({
    title: zod_1.z.string().nonempty("Lecture title is required").min(3, "Title too short"),
    videoUrl: zod_1.z.string().nonempty("Video URL is required").url("Invalid URL format"),
    duration: zod_1.z.number().int("Duration must be an integer").min(1, "Duration is required"),
    isPreview: zod_1.z.boolean().optional(),
    resources: zod_1.z.string().url("Resource URL must be a valid URL.").optional(),
});
// Create Chapter
exports.createChapterSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().nonempty("Title is required").min(3, "Title too short"),
        course: objectIdSchema.describe("Course ID is required"),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    }),
});
// Create Chapter With Lectures (Transactional)
exports.createChapterWithLecturesSchema = zod_1.z.object({
    body: zod_1.z.object({
        chapter: zod_1.z.object({
            title: zod_1.z.string().nonempty("Title is required").min(3, "Title too short"),
            course: objectIdSchema.describe("Course ID is required"),
            order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
        }),
        lectures: zod_1.z.array(lectureDataSchema)
            .min(1, "At least one lecture is required")
            .max(50, "Maximum 50 lectures per creation batch"),
    }),
});
// Update Chapter
exports.updateChapterSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, "Title too short").optional(),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    }),
});
// Get Chapter / Update Chapter / Delete Chapter (ID in params)
exports.getChapterSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: objectIdSchema.describe("Chapter ID is required"), // Expects 'id'
    }),
});
exports.getCourseChaptersSchema = zod_1.z.object({
    params: zod_1.z.object({
        // Correctly matches the route parameter name
        courseId: objectIdSchema.describe("Course ID is required"),
    }),
});
// Reorder Chapters with Lectures
exports.reorderChaptersWithLecturesSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: objectIdSchema.describe("Course ID is required"),
        order: zod_1.z.array(zod_1.z.object({
            chapterId: objectIdSchema.describe("Chapter ID is required"),
            order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1"),
            lectures: zod_1.z.array(zod_1.z.object({
                lectureId: objectIdSchema.describe("Lecture ID is required"),
                order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1"),
            })).optional().default([]),
        })).min(1, "At least one chapter must be reordered"),
    }),
});
// Schema for bulk chapter operations
exports.bulkUpdateChaptersSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: objectIdSchema.describe("Course ID is required"),
        chapters: zod_1.z.array(zod_1.z.object({
            id: objectIdSchema.describe("Chapter ID is required"),
            title: zod_1.z.string().min(3, "Title too short").optional(),
            order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
        })).min(1, "At least one chapter must be provided"),
    }),
});
//# sourceMappingURL=chapter.validation.js.map