"use strict";
// src/modules/quizes/quiz.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateQuizStats = exports.bulkDeleteQuizzesByCourse = exports.bulkDeleteQuizzesByChapter = exports.bulkUpdateQuizzes = exports.deleteQuizById = exports.updateQuizById = exports.createQuiz = exports.countQuizzesByCourse = exports.countQuizzesByChapter = exports.findQuizzesByCourse = exports.findQuizzesByChapter = exports.findQuizById = void 0;
const mongoose_1 = require("mongoose");
const quiz_model_1 = __importDefault(require("./quiz.model"));
// --- READ Operations ---
const findQuizById = (quizId, session) => {
    return quiz_model_1.default.findById(quizId).session(session || null);
};
exports.findQuizById = findQuizById;
const findQuizzesByChapter = (chapterId, session) => {
    return quiz_model_1.default.find({ chapter: chapterId }).sort({ order: 1 }).session(session || null);
};
exports.findQuizzesByChapter = findQuizzesByChapter;
const findQuizzesByCourse = (courseId, session) => {
    return quiz_model_1.default.find({ course: courseId })
        .populate('chapter', 'title order')
        .sort({ order: 1 })
        .session(session || null);
};
exports.findQuizzesByCourse = findQuizzesByCourse;
const countQuizzesByChapter = (chapterId, session) => {
    return quiz_model_1.default.countDocuments({ chapter: chapterId }).session(session || null);
};
exports.countQuizzesByChapter = countQuizzesByChapter;
const countQuizzesByCourse = (courseId, session) => {
    return quiz_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countQuizzesByCourse = countQuizzesByCourse;
// --- WRITE Operations ---
const createQuiz = (data, session) => {
    return quiz_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create quiz document.");
        }
        return res[0];
    });
};
exports.createQuiz = createQuiz;
const updateQuizById = (quizId, updateData, session) => {
    return quiz_model_1.default.findByIdAndUpdate(quizId, updateData, {
        new: true,
        runValidators: true
    }).session(session || null);
};
exports.updateQuizById = updateQuizById;
const deleteQuizById = (quizId, session) => {
    return quiz_model_1.default.findByIdAndDelete(quizId).session(session || null);
};
exports.deleteQuizById = deleteQuizById;
// --- BULK Operations ---
const bulkUpdateQuizzes = async (operations, session) => {
    const bulkOps = operations.map((op) => ({
        updateOne: {
            filter: { _id: op.quizId },
            update: { $set: { order: op.order } }
        },
    }));
    if (bulkOps.length > 0) {
        await quiz_model_1.default.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
    }
};
exports.bulkUpdateQuizzes = bulkUpdateQuizzes;
const bulkDeleteQuizzesByChapter = async (chapterId, session) => {
    await quiz_model_1.default.deleteMany({ chapter: chapterId }).session(session || null);
};
exports.bulkDeleteQuizzesByChapter = bulkDeleteQuizzesByChapter;
const bulkDeleteQuizzesByCourse = async (courseId, session) => {
    await quiz_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteQuizzesByCourse = bulkDeleteQuizzesByCourse;
// --- AGGREGATION Operations ---
const aggregateQuizStats = async (courseId) => {
    return quiz_model_1.default.aggregate([
        { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: "$course",
                totalQuizzes: { $sum: 1 },
                totalQuestions: {
                    $sum: { $size: "$questions" }
                },
                averageQuestionsPerQuiz: {
                    $avg: { $size: "$questions" }
                }
            }
        }
    ]);
};
exports.aggregateQuizStats = aggregateQuizStats;
//# sourceMappingURL=quiz.repository.js.map