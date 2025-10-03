"use strict";
// src/modules/reviews/review.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateRecentReviews = exports.aggregateInstructorReviewStats = exports.aggregateCourseReviewStats = exports.bulkDeleteReviewsByUser = exports.bulkDeleteReviewsByCourse = exports.deleteReviewByUserAndCourse = exports.deleteReviewById = exports.updateReviewById = exports.createReview = exports.countReviewsByUser = exports.countReviewsByCourse = exports.findReviewsByRating = exports.findReviewsByUser = exports.findReviewsByCourse = exports.findReviewByUserAndCourse = exports.findReviewById = void 0;
const mongoose_1 = require("mongoose");
const review_model_1 = __importDefault(require("./review.model"));
// --- READ Operations ---
const findReviewById = (reviewId, session) => {
    return review_model_1.default.findById(reviewId)
        .populate('user', 'name avatar')
        .populate('course', 'title thumbnail')
        .session(session || null);
};
exports.findReviewById = findReviewById;
const findReviewByUserAndCourse = (userId, courseId, session) => {
    return review_model_1.default.findOne({ user: userId, course: courseId })
        .populate('user', 'name avatar')
        .session(session || null);
};
exports.findReviewByUserAndCourse = findReviewByUserAndCourse;
const findReviewsByCourse = (courseId, options = {}, session) => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    return review_model_1.default.find({ course: courseId })
        .populate('user', 'name avatar')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findReviewsByCourse = findReviewsByCourse;
const findReviewsByUser = (userId, options = {}, session) => {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    return review_model_1.default.find({ user: userId })
        .populate('course', 'title thumbnail instructor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findReviewsByUser = findReviewsByUser;
const findReviewsByRating = (courseId, rating, session) => {
    return review_model_1.default.find({ course: courseId, rating })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .session(session || null);
};
exports.findReviewsByRating = findReviewsByRating;
const countReviewsByCourse = (courseId, session) => {
    return review_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countReviewsByCourse = countReviewsByCourse;
const countReviewsByUser = (userId, session) => {
    return review_model_1.default.countDocuments({ user: userId }).session(session || null);
};
exports.countReviewsByUser = countReviewsByUser;
// --- WRITE Operations ---
const createReview = (data, session) => {
    return review_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create review document.");
        }
        return res[0];
    });
};
exports.createReview = createReview;
const updateReviewById = (reviewId, updateData, session) => {
    return review_model_1.default.findByIdAndUpdate(reviewId, updateData, {
        new: true,
        runValidators: true
    }).populate('user', 'name avatar').session(session || null);
};
exports.updateReviewById = updateReviewById;
const deleteReviewById = (reviewId, session) => {
    return review_model_1.default.findByIdAndDelete(reviewId).session(session || null);
};
exports.deleteReviewById = deleteReviewById;
const deleteReviewByUserAndCourse = (userId, courseId, session) => {
    return review_model_1.default.findOneAndDelete({ user: userId, course: courseId }).session(session || null);
};
exports.deleteReviewByUserAndCourse = deleteReviewByUserAndCourse;
// --- BULK Operations ---
const bulkDeleteReviewsByCourse = async (courseId, session) => {
    await review_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteReviewsByCourse = bulkDeleteReviewsByCourse;
const bulkDeleteReviewsByUser = async (userId, session) => {
    await review_model_1.default.deleteMany({ user: userId }).session(session || null);
};
exports.bulkDeleteReviewsByUser = bulkDeleteReviewsByUser;
// --- AGGREGATION Operations ---
const aggregateCourseReviewStats = async (courseId) => {
    return review_model_1.default.aggregate([
        { $match: { course: new mongoose_1.Types.ObjectId(courseId) } },
        {
            $group: {
                _id: "$course",
                totalReviews: { $sum: 1 },
                averageRating: { $avg: "$rating" },
                ratings: { $push: "$rating" }
            }
        },
        {
            $addFields: {
                ratingDistribution: {
                    "1": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 1] } } } },
                    "2": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 2] } } } },
                    "3": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 3] } } } },
                    "4": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 4] } } } },
                    "5": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 5] } } } }
                }
            }
        },
        {
            $project: {
                totalReviews: 1,
                averageRating: { $round: ["$averageRating", 1] },
                ratingDistribution: 1
            }
        }
    ]);
};
exports.aggregateCourseReviewStats = aggregateCourseReviewStats;
const aggregateInstructorReviewStats = async (instructorId) => {
    return review_model_1.default.aggregate([
        {
            $lookup: {
                from: "courses",
                localField: "course",
                foreignField: "_id",
                as: "courseData"
            }
        },
        { $unwind: "$courseData" },
        { $match: { "courseData.instructor": new mongoose_1.Types.ObjectId(instructorId) } },
        {
            $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                averageRating: { $avg: "$rating" },
                totalCourses: { $addToSet: "$course" }
            }
        },
        {
            $addFields: {
                totalCourses: { $size: "$totalCourses" }
            }
        }
    ]);
};
exports.aggregateInstructorReviewStats = aggregateInstructorReviewStats;
const aggregateRecentReviews = async (limit = 10) => {
    return review_model_1.default.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userData",
                pipeline: [{ $project: { name: 1, avatar: 1 } }]
            }
        },
        {
            $lookup: {
                from: "courses",
                localField: "course",
                foreignField: "_id",
                as: "courseData",
                pipeline: [{ $project: { title: 1, thumbnail: 1 } }]
            }
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$courseData", preserveNullAndEmptyArrays: true } }
    ]);
};
exports.aggregateRecentReviews = aggregateRecentReviews;
//# sourceMappingURL=review.repository.js.map