"use strict";
// src/modules/lectures/lecture.validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderLecturesSchema = exports.chapterIdSchema = exports.lectureIdSchema = exports.updateLectureSchema = exports.createLectureSchema = void 0;
const zod_1 = require("zod");
// Base Zod validator for MongoDB ObjectId format
const hexRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = zod_1.z.string()
    .trim()
    .refine(val => {
    return val.length === 24 && hexRegex.test(val);
}, {
    message: "Invalid ID format. Must be a 24-character ObjectId."
});
// 1. Create Lecture Schema
exports.createLectureSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().nonempty("Lecture title is required").min(3, "Title is too short."),
        course: objectIdSchema.describe("Course ID is required"),
        chapter: objectIdSchema.describe("Chapter ID is required"),
        videoUrl: zod_1.z.string().nonempty("Video URL is required").url("Invalid URL format."),
        duration: zod_1.z.number().int("Duration must be an integer").min(1, "Duration must be at least 1 second."),
        isPreview: zod_1.z.boolean().optional(),
        resources: zod_1.z.string().url("Resource URL must be a valid URL.").optional(),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
    }),
});
// 2. Update Lecture Schema
exports.updateLectureSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().nonempty("Title is required").min(3, "Title is too short.").optional(),
        videoUrl: zod_1.z.string().nonempty("Video URL is required").url("Invalid URL format.").optional(),
        duration: zod_1.z.number().int("Duration must be an integer").min(1, "Duration must be at least 1 second.").optional(),
        order: zod_1.z.number().int("Order must be an integer").min(1, "Order must be >=1").optional(),
        isPreview: zod_1.z.boolean().optional(),
        resources: zod_1.z.string().url("Resource URL must be a valid URL.").optional().nullable(), // Allow null to remove
    }),
});
// 3. ID Validation Schema for params
exports.lectureIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: objectIdSchema.describe("Lecture ID is required"),
    }),
});
// 4. Chapter ID Validation for list views
exports.chapterIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        chapterId: objectIdSchema.describe("Chapter ID is required"),
    }),
});
exports.reorderLecturesSchema = zod_1.z.object({
    body: zod_1.z.object({
        // FIX: We must include chapterId as it is in the payload and required by the service
        chapterId: objectIdSchema.describe("Chapter ID is required"),
        order: zod_1.z.array(zod_1.z.object({
            lectureId: objectIdSchema.describe("Lecture ID is required"),
            order: zod_1.z.number().int().min(1, "Order must be >=1"),
        })).min(1, "At least one lecture must be reordered"),
    })
});
//# sourceMappingURL=lecture.validation.js.map