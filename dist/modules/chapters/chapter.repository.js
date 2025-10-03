"use strict";
// src/modules/chapters/chapter.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChapterDependencies = exports.bulkUpdateChapters = exports.deleteChapterById = exports.updateChapterById = exports.createChapter = exports.countChaptersByCourse = exports.findChaptersByCourse = exports.findChapterById = void 0;
const chapter_model_1 = __importDefault(require("./chapter.model"));
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
// --- READ Operations ---
const findChapterById = (chapterId, session) => {
    return chapter_model_1.default.findById(chapterId).session(session || null);
};
exports.findChapterById = findChapterById;
const findChaptersByCourse = (courseId, session) => {
    return chapter_model_1.default.find({ course: courseId }).sort({ order: 1 }).session(session || null);
};
exports.findChaptersByCourse = findChaptersByCourse;
const countChaptersByCourse = (courseId, session) => {
    return chapter_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countChaptersByCourse = countChaptersByCourse;
// --- WRITE Operations ---
const createChapter = (data, session) => {
    return chapter_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create chapter document.");
        }
        return res[0];
    });
};
exports.createChapter = createChapter;
const updateChapterById = (chapterId, updateData, session) => {
    return chapter_model_1.default.findByIdAndUpdate(chapterId, updateData, {
        new: true,
        runValidators: true
    }).session(session || null);
};
exports.updateChapterById = updateChapterById;
const deleteChapterById = (chapterId, session) => {
    return chapter_model_1.default.findByIdAndDelete(chapterId).session(session || null);
};
exports.deleteChapterById = deleteChapterById;
// --- BULK Operations ---
const bulkUpdateChapters = async (operations, session) => {
    const bulkOps = operations.map((op) => ({
        updateOne: {
            filter: { _id: op.chapterId },
            update: { $set: { order: op.order } }
        },
    }));
    if (bulkOps.length > 0) {
        await chapter_model_1.default.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
    }
};
exports.bulkUpdateChapters = bulkUpdateChapters;
// --- CASCADING Operations ---
const deleteChapterDependencies = async (chapterId, session) => {
    // Delete all lectures associated with this chapter
    await lecture_model_1.default.deleteMany({ chapter: chapterId }).session(session);
};
exports.deleteChapterDependencies = deleteChapterDependencies;
//# sourceMappingURL=chapter.repository.js.map