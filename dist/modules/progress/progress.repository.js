"use strict";
// src/modules/progress/progress.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateCourseStats = exports.aggregateUserStats = exports.bulkDeleteProgressByUser = exports.bulkDeleteProgressByCourse = exports.deleteProgressByUserAndCourse = exports.deleteProgressById = exports.updateProgressByUserAndCourse = exports.updateProgressById = exports.createProgress = exports.countCompletedByCourse = exports.countProgressByCourse = exports.countCompletedCoursesByUser = exports.findProgressByUser = exports.findProgressByUserAndCourse = exports.findProgressById = void 0;
exports.findCourseProgress = findCourseProgress;
const mongoose_1 = require("mongoose");
const progress_model_1 = __importDefault(require("./progress.model"));
const course_model_1 = __importDefault(require("../courses/course.model"));
// --- READ Operations ---
const findProgressById = (progressId, session) => {
    return progress_model_1.default.findById(progressId).session(session || null);
};
exports.findProgressById = findProgressById;
const findProgressByUserAndCourse = (userId, courseId, session) => {
    return progress_model_1.default.findOne({ user: userId, course: courseId }).session(session || null);
};
exports.findProgressByUserAndCourse = findProgressByUserAndCourse;
const findProgressByUser = (userId, session) => {
    return progress_model_1.default.find({ user: userId })
        .populate('course', 'title thumbnail category level averageRating')
        .sort({ updatedAt: -1 })
        .session(session || null);
};
exports.findProgressByUser = findProgressByUser;
async function findCourseProgress(userId, courseId) {
    const progress = await progress_model_1.default.findOne({
        user: userId,
        course: courseId,
    }).lean();
    // If no progress exists yet, create default response
    if (!progress) {
        const course = await course_model_1.default.findById(courseId)
            .select("title thumbnail")
            .lean();
        return {
            course,
            completedLectures: {},
            totalLecturesCompleted: 0,
            quizzesCompleted: false,
            averageQuizScore: 0,
            isCourseCompleted: false,
            lastViewedLecture: null,
            completionPercentage: 0,
            totalLectures: 0,
            remainingLectures: 0,
        };
    }
    return progress;
}
const countCompletedCoursesByUser = (userId, session) => {
    return progress_model_1.default.countDocuments({
        user: userId,
        isCourseCompleted: true
    }).session(session || null);
};
exports.countCompletedCoursesByUser = countCompletedCoursesByUser;
const countProgressByCourse = (courseId, session) => {
    return progress_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countProgressByCourse = countProgressByCourse;
const countCompletedByCourse = (courseId, session) => {
    return progress_model_1.default.countDocuments({
        course: courseId,
        isCourseCompleted: true
    }).session(session || null);
};
exports.countCompletedByCourse = countCompletedByCourse;
// --- WRITE Operations ---
const createProgress = (data, session) => {
    return progress_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create progress document.");
        }
        return res[0];
    });
};
exports.createProgress = createProgress;
const updateProgressById = (progressId, updateData, session) => {
    return progress_model_1.default.findByIdAndUpdate(progressId, updateData, {
        new: true,
        runValidators: true
    }).session(session || null);
};
exports.updateProgressById = updateProgressById;
const updateProgressByUserAndCourse = (userId, courseId, updateData, session) => {
    return progress_model_1.default.findOneAndUpdate({ user: userId, course: courseId }, updateData, { new: true, runValidators: true, upsert: true }).session(session || null);
};
exports.updateProgressByUserAndCourse = updateProgressByUserAndCourse;
const deleteProgressById = (progressId, session) => {
    return progress_model_1.default.findByIdAndDelete(progressId).session(session || null);
};
exports.deleteProgressById = deleteProgressById;
const deleteProgressByUserAndCourse = (userId, courseId, session) => {
    return progress_model_1.default.findOneAndDelete({ user: userId, course: courseId }).session(session || null);
};
exports.deleteProgressByUserAndCourse = deleteProgressByUserAndCourse;
// --- BULK Operations ---
const bulkDeleteProgressByCourse = async (courseId, session) => {
    await progress_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteProgressByCourse = bulkDeleteProgressByCourse;
const bulkDeleteProgressByUser = async (userId, session) => {
    await progress_model_1.default.deleteMany({ user: userId }).session(session || null);
};
exports.bulkDeleteProgressByUser = bulkDeleteProgressByUser;
// --- AGGREGATION Operations ---
const aggregateUserStats = async (userId) => {
    return progress_model_1.default.aggregate([
        { $match: { user: new mongoose_1.Types.ObjectId(userId) } },
        {
            $group: {
                _id: "$user",
                totalCourses: { $sum: 1 },
                completedCourses: {
                    $sum: { $cond: [{ $eq: ["$isCourseCompleted", true] }, 1, 0] }
                },
                totalLecturesCompleted: { $sum: "$totalLecturesCompleted" },
                averageQuizScore: { $avg: "$averageQuizScore" }
            }
        }
    ]);
};
exports.aggregateUserStats = aggregateUserStats;
const aggregateCourseStats = async (courseId) => {
    return progress_model_1.default.aggregate([
        { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: "$course",
                totalStudents: { $sum: 1 },
                completedStudents: {
                    $sum: { $cond: [{ $eq: ["$isCourseCompleted", true] }, 1, 0] }
                },
                averageProgress: {
                    $avg: {
                        $divide: ["$totalLecturesCompleted", { $ifNull: ["$totalLectures", 1] }]
                    }
                },
                averageQuizScore: { $avg: "$averageQuizScore" }
            }
        }
    ]);
};
exports.aggregateCourseStats = aggregateCourseStats;
//# sourceMappingURL=progress.repository.js.map