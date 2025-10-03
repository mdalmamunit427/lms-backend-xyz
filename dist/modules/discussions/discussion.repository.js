"use strict";
// src/modules/discussions/discussion.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateDiscussionStats = exports.bulkDeleteDiscussionsByUser = exports.bulkDeleteDiscussionsByCourse = exports.bulkDeleteDiscussionsByLecture = exports.deleteDiscussionByUserAndId = exports.deleteDiscussionById = exports.addAnswerToDiscussion = exports.updateDiscussionById = exports.createDiscussion = exports.countDiscussionsByUser = exports.countDiscussionsByCourse = exports.countDiscussionsByLecture = exports.findUnansweredDiscussions = exports.findDiscussionsByUser = exports.findDiscussionsByCourse = exports.findDiscussionsByLecture = exports.findDiscussionById = void 0;
const mongoose_1 = require("mongoose");
const discussion_model_1 = __importDefault(require("./discussion.model"));
// --- READ Operations ---
const findDiscussionById = (discussionId, session) => {
    return discussion_model_1.default.findById(discussionId)
        .populate('user', 'name avatar')
        .populate('lecture', 'title order')
        .populate('answers.user', 'name avatar')
        .session(session || null);
};
exports.findDiscussionById = findDiscussionById;
const findDiscussionsByLecture = (lectureId, options = {}, session) => {
    const { page = 1, limit = 20, hasAnswers } = options;
    const skip = (page - 1) * limit;
    const query = { lecture: lectureId };
    if (hasAnswers !== undefined) {
        query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
    }
    return discussion_model_1.default.find(query)
        .populate('user', 'name avatar')
        .populate('answers.user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findDiscussionsByLecture = findDiscussionsByLecture;
const findDiscussionsByCourse = (courseId, options = {}, session) => {
    const { page = 1, limit = 50, hasAnswers } = options;
    const skip = (page - 1) * limit;
    const query = { course: courseId };
    if (hasAnswers !== undefined) {
        query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
    }
    return discussion_model_1.default.find(query)
        .populate('user', 'name avatar')
        .populate('lecture', 'title order')
        .populate('answers.user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findDiscussionsByCourse = findDiscussionsByCourse;
const findDiscussionsByUser = (userId, options = {}, session) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    return discussion_model_1.default.find({ user: userId })
        .populate('lecture', 'title order')
        .populate('course', 'title thumbnail')
        .populate('answers.user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findDiscussionsByUser = findDiscussionsByUser;
const findUnansweredDiscussions = (courseId, limit = 20, session) => {
    const query = { 'answers.0': { $exists: false } };
    if (courseId)
        query.course = courseId;
    return discussion_model_1.default.find(query)
        .populate('user', 'name avatar')
        .populate('lecture', 'title order')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .session(session || null);
};
exports.findUnansweredDiscussions = findUnansweredDiscussions;
const countDiscussionsByLecture = (lectureId, session) => {
    return discussion_model_1.default.countDocuments({ lecture: lectureId }).session(session || null);
};
exports.countDiscussionsByLecture = countDiscussionsByLecture;
const countDiscussionsByCourse = (courseId, session) => {
    return discussion_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countDiscussionsByCourse = countDiscussionsByCourse;
const countDiscussionsByUser = (userId, session) => {
    return discussion_model_1.default.countDocuments({ user: userId }).session(session || null);
};
exports.countDiscussionsByUser = countDiscussionsByUser;
// --- WRITE Operations ---
const createDiscussion = (data, session) => {
    return discussion_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create discussion document.");
        }
        return res[0];
    });
};
exports.createDiscussion = createDiscussion;
const updateDiscussionById = (discussionId, updateData, session) => {
    return discussion_model_1.default.findByIdAndUpdate(discussionId, updateData, {
        new: true,
        runValidators: true
    }).populate('user', 'name avatar').session(session || null);
};
exports.updateDiscussionById = updateDiscussionById;
const addAnswerToDiscussion = (discussionId, answer, session) => {
    return discussion_model_1.default.findByIdAndUpdate(discussionId, { $push: { answers: answer } }, { new: true, runValidators: true }).populate([
        { path: 'user', select: 'name avatar' },
        { path: 'answers.user', select: 'name avatar' }
    ]).session(session || null);
};
exports.addAnswerToDiscussion = addAnswerToDiscussion;
const deleteDiscussionById = (discussionId, session) => {
    return discussion_model_1.default.findByIdAndDelete(discussionId).session(session || null);
};
exports.deleteDiscussionById = deleteDiscussionById;
const deleteDiscussionByUserAndId = (discussionId, userId, session) => {
    return discussion_model_1.default.findOneAndDelete({
        _id: discussionId,
        user: userId
    }).session(session || null);
};
exports.deleteDiscussionByUserAndId = deleteDiscussionByUserAndId;
// --- BULK Operations ---
const bulkDeleteDiscussionsByLecture = async (lectureId, session) => {
    await discussion_model_1.default.deleteMany({ lecture: lectureId }).session(session || null);
};
exports.bulkDeleteDiscussionsByLecture = bulkDeleteDiscussionsByLecture;
const bulkDeleteDiscussionsByCourse = async (courseId, session) => {
    await discussion_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteDiscussionsByCourse = bulkDeleteDiscussionsByCourse;
const bulkDeleteDiscussionsByUser = async (userId, session) => {
    await discussion_model_1.default.deleteMany({ user: userId }).session(session || null);
};
exports.bulkDeleteDiscussionsByUser = bulkDeleteDiscussionsByUser;
// --- AGGREGATION Operations ---
const aggregateDiscussionStats = async (courseId) => {
    const pipeline = [];
    if (courseId) {
        pipeline.push({ $match: { course: new mongoose_1.Types.ObjectId(courseId) } });
    }
    return discussion_model_1.default.aggregate([
        ...pipeline,
        {
            $group: {
                _id: courseId ? "$course" : null,
                totalDiscussions: { $sum: 1 },
                totalAnswers: { $sum: { $size: "$answers" } },
                unanswered: {
                    $sum: { $cond: [{ $eq: [{ $size: "$answers" }, 0] }, 1, 0] }
                },
                answered: {
                    $sum: { $cond: [{ $gt: [{ $size: "$answers" }, 0] }, 1, 0] }
                }
            }
        },
        {
            $addFields: {
                answerRate: {
                    $round: [{
                            $multiply: [{
                                    $divide: ["$answered", "$totalDiscussions"]
                                }, 100]
                        }, 2]
                },
                averageAnswersPerDiscussion: {
                    $round: [{
                            $divide: ["$totalAnswers", "$totalDiscussions"]
                        }, 2]
                }
            }
        }
    ]);
};
exports.aggregateDiscussionStats = aggregateDiscussionStats;
//# sourceMappingURL=discussion.repository.js.map