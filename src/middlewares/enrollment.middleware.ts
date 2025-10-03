import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";
import { getUserId, getUserRole, toObjectId } from "../utils/common";
import Lecture from "../modules/lectures/lecture.model";
import Discussion from "../modules/discussions/discussion.model";
import Enrollment from "../modules/enrollments/enrollment.model";
import Quiz from "../modules/quizes/quiz.model";
import { createError } from "../utils/errorHandler";
import { catchAsync } from "./catchAsync";

// Local helper: assert that the given user is enrolled in the given course
const assertUserEnrolled = async (userId: string, courseId: string, message: string) => {
    const exists = await Enrollment.exists({
        student: toObjectId(userId),
        course: toObjectId(courseId),
    });
    if (!exists) {
        throw createError(message, 403);
    }
};

// Local helpers to resolve courseId from various resources
const getCourseIdFromLecture = async (lectureId: string): Promise<string> => {
    const lecture = await Lecture.findById(lectureId).select("course");
    if (!lecture) {
        throw createError("Lecture not found", 404);
    }
    return lecture.course.toString();
};

const getCourseIdFromDiscussion = async (discussionId: string): Promise<string> => {
    const discussion = await Discussion.findById(discussionId).select("course");
    if (!discussion) {
        throw createError("Discussion not found", 404);
    }
    return discussion.course.toString();
};

const getCourseIdFromQuiz = async (quizId: string): Promise<string> => {
    const quiz = await Quiz.findById(quizId).select("course");
    if (!quiz) {
        throw createError("Quiz not found", 404);
    }
    return quiz.course.toString();
};

// Require enrollment based on lecture id present in body (for creating a discussion)
export const requireEnrollmentForLectureBody = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = getUserId(req as any);
    const lectureId: string | undefined = req.body?.lecture;

    if (!lectureId) {
        throw createError("Lecture ID is required", 400);
    }

    const courseId = await getCourseIdFromLecture(lectureId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to create discussions.");

    return next();
});

// Require enrollment based on discussion id param (for answering a discussion)
export const requireEnrollmentForDiscussionParam = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = getUserId(req as any);
    const userRole = getUserRole(req as any);
    const discussionId: string | undefined = (req.params as any)?.id;

    if (!discussionId) {
        throw createError("Discussion ID is required", 400);
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
export const requireEnrollmentForCourseBody = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = getUserId(req as any);
    const courseId: string | undefined = req.body?.course;

    if (!courseId) {
        throw createError("Course ID is required", 400);
    }

    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to perform this action.");

    return next();
});

// Require enrollment based on lecture id in params (e.g., updating progress)
export const requireEnrollmentForLectureParam = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = getUserId(req as any);
    const lectureId: string | undefined = (req.params as any)?.lectureId;

    if (!lectureId) {
        throw createError("Lecture ID is required", 400);
    }

    const courseId = await getCourseIdFromLecture(lectureId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to perform this action.");

    return next();
});

// Require enrollment based on quiz id in params (e.g., submitting a quiz)
export const requireEnrollmentForQuizParam = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = getUserId(req as any);
    const quizId: string | undefined = (req.params as any)?.id;

    if (!quizId) {
        throw createError("Quiz ID is required", 400);
    }

    const courseId = await getCourseIdFromQuiz(quizId);
    await assertUserEnrolled(userId, courseId, "You must be enrolled in this course to submit the quiz.");

    return next();
});


