"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEnrollmentForQuizParam = exports.requireEnrollmentForLectureParam = exports.requireEnrollmentForCourseBody = exports.requireEnrollmentForDiscussionParam = exports.requireEnrollmentForLectureBody = void 0;
const common_1 = require("../utils/common");
const lecture_model_1 = __importDefault(require("../modules/lectures/lecture.model"));
const discussion_model_1 = __importDefault(require("../modules/discussions/discussion.model"));
const enrollment_model_1 = __importDefault(require("../modules/enrollments/enrollment.model"));
const quiz_model_1 = __importDefault(require("../modules/quizes/quiz.model"));
const errorHandler_1 = require("../utils/errorHandler");
const catchAsync_1 = require("./catchAsync");
// Local helper: assert that the given user is enrolled in the given course
const assertUserEnrolled = async (userId, courseId, message) => {
    const exists = await enrollment_model_1.default.exists({
        student: (0, common_1.toObjectId)(userId),
        course: (0, common_1.toObjectId)(courseId),
    });
    if (!exists) {
        throw (0, errorHandler_1.createError)(message, 403);
    }
};
// Local helpers to resolve courseId from various resources
const getCourseIdFromLecture = async (lectureId) => {
    const lecture = await lecture_model_1.default.findById(lectureId).select("course");
    if (!lecture) {
        throw (0, errorHandler_1.createError)("Lecture not found", 404);
    }
    return lecture.course.toString();
};
const getCourseIdFromDiscussion = async (discussionId) => {
    const discussion = await discussion_model_1.default.findById(discussionId).select("course");
    if (!discussion) {
        throw (0, errorHandler_1.createError)("Discussion not found", 404);
    }
    return discussion.course.toString();
};
const getCourseIdFromQuiz = async (quizId) => {
    const quiz = await quiz_model_1.default.findById(quizId).select("course");
    if (!quiz) {
        throw (0, errorHandler_1.createError)("Quiz not found", 404);
    }
    return quiz.course.toString();
};
// Require enrollment based on lecture id present in body (for creating a discussion)
exports.requireEnrollmentForLectureBody = (0, catchAsync_1.catchAsync)(async (req, _res, next) => {
    const userId = (0, common_1.getUserId)(req);
    const lectureId = req.body?.lecture;
    if (!lectureId) {
        throw (0, errorHandler_1.createError)("Lecture ID is required", 400);
    }
    const courseId = await getCourseIdFromLecture(lectureId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to create discussions.");
    return next();
});
// Require enrollment based on discussion id param (for answering a discussion)
exports.requireEnrollmentForDiscussionParam = (0, catchAsync_1.catchAsync)(async (req, _res, next) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    const discussionId = req.params?.id;
    if (!discussionId) {
        throw (0, errorHandler_1.createError)("Discussion ID is required", 400);
    }
    // Allow instructors/admins to answer regardless of enrollment
    if (userRole === "instructor" || userRole === "admin") {
        return next();
    }
    const courseId = await getCourseIdFromDiscussion(discussionId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to reply to discussions.");
    return next();
});
// Require enrollment based on course id present in body (e.g., creating a review)
exports.requireEnrollmentForCourseBody = (0, catchAsync_1.catchAsync)(async (req, _res, next) => {
    const userId = (0, common_1.getUserId)(req);
    const courseId = req.body?.course;
    if (!courseId) {
        throw (0, errorHandler_1.createError)("Course ID is required", 400);
    }
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to perform this action.");
    return next();
});
// Require enrollment based on lecture id in params (e.g., updating progress)
exports.requireEnrollmentForLectureParam = (0, catchAsync_1.catchAsync)(async (req, _res, next) => {
    const userId = (0, common_1.getUserId)(req);
    const lectureId = req.params?.lectureId;
    if (!lectureId) {
        throw (0, errorHandler_1.createError)("Lecture ID is required", 400);
    }
    const courseId = await getCourseIdFromLecture(lectureId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to perform this action.");
    return next();
});
// Require enrollment based on quiz id in params (e.g., submitting a quiz)
exports.requireEnrollmentForQuizParam = (0, catchAsync_1.catchAsync)(async (req, _res, next) => {
    const userId = (0, common_1.getUserId)(req);
    const quizId = req.params?.id;
    if (!quizId) {
        throw (0, errorHandler_1.createError)("Quiz ID is required", 400);
    }
    const courseId = await getCourseIdFromQuiz(quizId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to submit the quiz.");
    return next();
});
//# sourceMappingURL=enrollment.middleware.js.map