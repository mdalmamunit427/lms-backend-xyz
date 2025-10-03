"use strict";
// src/modules/certificates/certificate.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateCertificatesByPeriod = exports.aggregateCertificateStats = exports.bulkDeleteCertificatesByUser = exports.bulkDeleteCertificatesByCourse = exports.deleteCertificateByUserAndCourse = exports.deleteCertificateById = exports.updateCertificateById = exports.createCertificate = exports.countCertificatesByCourse = exports.countCertificatesByUser = exports.findRecentCertificates = exports.findCertificatesByCourse = exports.findCertificatesByUser = exports.findCertificateByUserAndCourse = exports.findCertificateById = void 0;
const mongoose_1 = require("mongoose");
const certificate_model_1 = __importDefault(require("./certificate.model"));
// --- READ Operations ---
const findCertificateById = (certificateId, session) => {
    return certificate_model_1.default.findOne({ certificateId })
        .populate('course', 'title instructor')
        .populate('user', 'name email')
        .session(session || null);
};
exports.findCertificateById = findCertificateById;
const findCertificateByUserAndCourse = (userId, courseId, session) => {
    return certificate_model_1.default.findOne({ user: userId, course: courseId })
        .populate('course', 'title instructor')
        .populate('user', 'name email')
        .session(session || null);
};
exports.findCertificateByUserAndCourse = findCertificateByUserAndCourse;
const findCertificatesByUser = (userId, options = {}, session) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    return certificate_model_1.default.find({ user: userId })
        .populate('course', 'title thumbnail instructor')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findCertificatesByUser = findCertificatesByUser;
const findCertificatesByCourse = (courseId, options = {}, session) => {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    return certificate_model_1.default.find({ course: courseId })
        .populate('user', 'name email')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null);
};
exports.findCertificatesByCourse = findCertificatesByCourse;
const findRecentCertificates = (limit = 20, session) => {
    return certificate_model_1.default.find({})
        .populate('course', 'title')
        .populate('user', 'name email')
        .sort({ issueDate: -1 })
        .limit(limit)
        .session(session || null);
};
exports.findRecentCertificates = findRecentCertificates;
const countCertificatesByUser = (userId, session) => {
    return certificate_model_1.default.countDocuments({ user: userId }).session(session || null);
};
exports.countCertificatesByUser = countCertificatesByUser;
const countCertificatesByCourse = (courseId, session) => {
    return certificate_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countCertificatesByCourse = countCertificatesByCourse;
// --- WRITE Operations ---
const createCertificate = (data, session) => {
    return certificate_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create certificate document.");
        }
        return res[0];
    });
};
exports.createCertificate = createCertificate;
const updateCertificateById = (certificateId, updateData, session) => {
    return certificate_model_1.default.findOneAndUpdate({ certificateId }, updateData, { new: true, runValidators: true }).session(session || null);
};
exports.updateCertificateById = updateCertificateById;
const deleteCertificateById = (certificateId, session) => {
    return certificate_model_1.default.findOneAndDelete({ certificateId }).session(session || null);
};
exports.deleteCertificateById = deleteCertificateById;
const deleteCertificateByUserAndCourse = (userId, courseId, session) => {
    return certificate_model_1.default.findOneAndDelete({
        user: userId,
        course: courseId
    }).session(session || null);
};
exports.deleteCertificateByUserAndCourse = deleteCertificateByUserAndCourse;
// --- BULK Operations ---
const bulkDeleteCertificatesByCourse = async (courseId, session) => {
    await certificate_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteCertificatesByCourse = bulkDeleteCertificatesByCourse;
const bulkDeleteCertificatesByUser = async (userId, session) => {
    await certificate_model_1.default.deleteMany({ user: userId }).session(session || null);
};
exports.bulkDeleteCertificatesByUser = bulkDeleteCertificatesByUser;
// --- AGGREGATION Operations ---
const aggregateCertificateStats = async (options = {}) => {
    const { startDate, endDate, courseId } = options;
    const matchStage = {};
    if (startDate || endDate) {
        matchStage.issueDate = {};
        if (startDate)
            matchStage.issueDate.$gte = startDate;
        if (endDate)
            matchStage.issueDate.$lte = endDate;
    }
    if (courseId)
        matchStage.course = new mongoose_1.Types.ObjectId(courseId);
    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
    }
    return certificate_model_1.default.aggregate([
        ...pipeline,
        {
            $group: {
                _id: null,
                totalCertificates: { $sum: 1 },
                uniqueUsers: { $addToSet: "$user" },
                uniqueCourses: { $addToSet: "$course" }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: "$uniqueUsers" },
                uniqueCourseCount: { $size: "$uniqueCourses" }
            }
        }
    ]);
};
exports.aggregateCertificateStats = aggregateCertificateStats;
const aggregateCertificatesByPeriod = async (period = 'month') => {
    const groupBy = {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$issueDate" } },
        week: { $dateToString: { format: "%Y-W%V", date: "$issueDate" } },
        month: { $dateToString: { format: "%Y-%m", date: "$issueDate" } }
    };
    return certificate_model_1.default.aggregate([
        {
            $group: {
                _id: groupBy[period],
                certificatesIssued: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};
exports.aggregateCertificatesByPeriod = aggregateCertificatesByPeriod;
//# sourceMappingURL=certificate.repository.js.map