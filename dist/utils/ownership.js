"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCourseAndOwnership = void 0;
const course_model_1 = __importDefault(require("../modules/courses/course.model"));
const errorHandler_1 = require("./errorHandler");
const validateCourseAndOwnership = async (courseId, userId, userRole) => {
    const course = await course_model_1.default.findById(courseId);
    if (!course) {
        throw (0, errorHandler_1.createError)("Course not found", 404);
    }
    const isAdmin = userRole === 'admin';
    const isOwner = course.instructor.toString() === userId;
    if (!isAdmin && !isOwner) {
        throw (0, errorHandler_1.createError)("You do not have permission to manage this course's content.", 403);
    }
    return course;
};
exports.validateCourseAndOwnership = validateCourseAndOwnership;
//# sourceMappingURL=ownership.js.map