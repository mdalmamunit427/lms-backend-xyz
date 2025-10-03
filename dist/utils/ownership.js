"use strict";
// src/utils/security/ownership.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCourseAndOwnership = void 0;
const course_model_1 = __importDefault(require("../modules/courses/course.model"));
const errorHandler_1 = require("./errorHandler");
/**
 * Validates the existence and ownership of a Course resource.
 * Enforces: Admin can manage any course; Instructor can only manage their own courses.
 * * @param courseId The ID of the course being modified.
 * @param userId The ID of the user attempting the action.
 * @param userRole The role of the user.
 * @param session The optional MongoDB session for transactional integrity.
 * @returns The verified Course document.
 */
const validateCourseAndOwnership = async (courseId, userId, userRole, session) => {
    // 1. Find the course
    const course = await course_model_1.default.findById(courseId).session(session);
    if (!course) {
        throw (0, errorHandler_1.createError)("Course not found", 404);
    }
    // 2. Check Permissions
    const isAdmin = userRole === 'admin';
    // ASSUMPTION: Course model has a single 'instructor' ObjectId field
    const isOwner = course.instructor.toString() === userId;
    if (!isAdmin && !isOwner) {
        throw (0, errorHandler_1.createError)("You do not have permission to manage this course's content.", 403);
    }
    return course;
};
exports.validateCourseAndOwnership = validateCourseAndOwnership;
//# sourceMappingURL=ownership.js.map