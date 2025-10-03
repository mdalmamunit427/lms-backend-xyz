"use strict";
// src/modules/lectures/lecture.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateLectureStats = exports.bulkDeleteLecturesByCourse = exports.bulkDeleteLecturesByChapter = exports.bulkUpdateLectures = exports.deleteLectureById = exports.updateLectureById = exports.createLecture = exports.countLecturesByCourse = exports.countLecturesByChapter = exports.findLecturesByCourse = exports.findLecturesByChapter = exports.findLectureById = void 0;
const mongoose_1 = require("mongoose");
const lecture_model_1 = __importDefault(require("./lecture.model"));
// --- READ Operations ---
const findLectureById = (lectureId, session) => {
    return lecture_model_1.default.findById(lectureId).session(session || null);
};
exports.findLectureById = findLectureById;
const findLecturesByChapter = (chapterId, session) => {
    return lecture_model_1.default.find({ chapter: chapterId }).sort({ order: 1 }).session(session || null);
};
exports.findLecturesByChapter = findLecturesByChapter;
const findLecturesByCourse = (courseId, session) => {
    return lecture_model_1.default.find({ course: courseId }).sort({ order: 1 }).session(session || null);
};
exports.findLecturesByCourse = findLecturesByCourse;
const countLecturesByChapter = (chapterId, session) => {
    return lecture_model_1.default.countDocuments({ chapter: chapterId }).session(session || null);
};
exports.countLecturesByChapter = countLecturesByChapter;
const countLecturesByCourse = (courseId, session) => {
    return lecture_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countLecturesByCourse = countLecturesByCourse;
// --- WRITE Operations ---
const createLecture = (data, session) => {
    return lecture_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create lecture document.");
        }
        return res[0];
    });
};
exports.createLecture = createLecture;
const updateLectureById = (lectureId, updateData, session) => {
    return lecture_model_1.default.findByIdAndUpdate(lectureId, updateData, {
        new: true,
        runValidators: true
    }).session(session || null);
};
exports.updateLectureById = updateLectureById;
const deleteLectureById = (lectureId, session) => {
    return lecture_model_1.default.findByIdAndDelete(lectureId).session(session || null);
};
exports.deleteLectureById = deleteLectureById;
// --- BULK Operations ---
const bulkUpdateLectures = async (operations, session) => {
    const bulkOps = operations.map((op) => ({
        updateOne: {
            filter: { _id: op.lectureId },
            update: { $set: { order: op.order } }
        },
    }));
    if (bulkOps.length > 0) {
        await lecture_model_1.default.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
    }
};
exports.bulkUpdateLectures = bulkUpdateLectures;
const bulkDeleteLecturesByChapter = async (chapterId, session) => {
    await lecture_model_1.default.deleteMany({ chapter: chapterId }).session(session || null);
};
exports.bulkDeleteLecturesByChapter = bulkDeleteLecturesByChapter;
const bulkDeleteLecturesByCourse = async (courseId, session) => {
    await lecture_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteLecturesByCourse = bulkDeleteLecturesByCourse;
// --- AGGREGATION Operations ---
const aggregateLectureStats = async (courseId) => {
    return lecture_model_1.default.aggregate([
        { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: "$course",
                totalLectures: { $sum: 1 },
                totalDuration: { $sum: "$duration" },
                previewCount: {
                    $sum: { $cond: [{ $eq: ["$isPreview", true] }, 1, 0] }
                }
            }
        }
    ]);
};
exports.aggregateLectureStats = aggregateLectureStats;
//# sourceMappingURL=lecture.repository.js.map