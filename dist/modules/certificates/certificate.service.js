"use strict";
// src/modules/certificates/certificate.service.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCertificateForDownload = exports.getCertificateStatsService = exports.verifyCertificateService = exports.getCertificateByIdService = exports.getUserCertificatesService = exports.getUserCertificateService = void 0;
const mongoose_1 = require("mongoose");
const cache_1 = require("../../utils/cache");
const certificate_model_1 = __importDefault(require("./certificate.model"));
// --- CORE SERVICE FUNCTIONS ---
/**
 * Get user certificate for a course with caching
 */
const getUserCertificateService = async (userId, courseId, cacheKey) => {
    try {
        const certificate = await certificate_model_1.default.findOne({ user: userId, course: courseId })
            .populate('course', 'title instructor')
            .populate('user', 'name email')
            .lean();
        if (!certificate) {
            return {
                success: false,
                message: 'Certificate not found',
                errors: ['No certificate found for the specified user and course']
            };
        }
        const responseData = { certificate, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Certificate retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve certificate',
            errors: [error.message]
        };
    }
};
exports.getUserCertificateService = getUserCertificateService;
/**
 * Get all user certificates with caching
 */
const getUserCertificatesService = async (userId, options = {}, cacheKey) => {
    try {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const certificates = await certificate_model_1.default.find({ user: userId })
            .populate('course', 'title thumbnail instructor')
            .sort({ issueDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await certificate_model_1.default.countDocuments({ user: userId });
        const responseData = {
            certificates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            cached: false
        };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'User certificates retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve user certificates',
            errors: [error.message]
        };
    }
};
exports.getUserCertificatesService = getUserCertificatesService;
/**
 * Get certificate by certificate ID (for verification)
 */
const getCertificateByIdService = async (certificateId, cacheKey) => {
    try {
        const certificate = await certificate_model_1.default.findOne({ certificateId })
            .populate('course', 'title instructor')
            .populate('user', 'name email')
            .lean();
        if (!certificate) {
            return {
                success: false,
                message: 'Certificate not found',
                errors: ['No certificate found with the provided ID']
            };
        }
        const responseData = { certificate, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Certificate retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve certificate',
            errors: [error.message]
        };
    }
};
exports.getCertificateByIdService = getCertificateByIdService;
/**
 * Verify certificate authenticity
 */
const verifyCertificateService = async (certificateId) => {
    try {
        const certificate = await certificate_model_1.default.findOne({ certificateId })
            .populate('course', 'title')
            .populate('user', 'name')
            .lean();
        if (!certificate) {
            return {
                success: false,
                message: 'Certificate not found',
                errors: ['No certificate found with the provided ID']
            };
        }
        return {
            success: true,
            data: {
                valid: true,
                certificate: {
                    id: certificate.certificateId,
                    student: certificate.user.name,
                    course: certificate.course.title,
                    issueDate: certificate.issueDate
                }
            },
            message: 'Certificate verification completed'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Certificate verification failed',
            errors: [error.message]
        };
    }
};
exports.verifyCertificateService = verifyCertificateService;
/**
 * Get certificate statistics with caching
 */
const getCertificateStatsService = async (options = {}, cacheKey) => {
    try {
        const { startDate, endDate, courseId } = options;
        const matchStage = {};
        if (startDate || endDate) {
            matchStage.issueDate = {};
            if (startDate)
                matchStage.issueDate.$gte = new Date(startDate);
            if (endDate)
                matchStage.issueDate.$lte = new Date(endDate);
        }
        if (courseId)
            matchStage.course = new mongoose_1.Types.ObjectId(courseId);
        const pipeline = [];
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        const stats = await certificate_model_1.default.aggregate([
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
            },
            {
                $project: {
                    totalCertificates: 1,
                    uniqueUserCount: 1,
                    uniqueCourseCount: 1
                }
            }
        ]);
        const result = stats.length > 0 ? stats[0] : {
            totalCertificates: 0,
            uniqueUserCount: 0,
            uniqueCourseCount: 0
        };
        const responseData = { stats: result, cached: false };
        await (0, cache_1.setCache)(cacheKey, responseData);
        return {
            success: true,
            data: responseData,
            message: 'Certificate stats retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve certificate stats',
            errors: [error.message]
        };
    }
};
exports.getCertificateStatsService = getCertificateStatsService;
/**
 * Get certificate for download by certificate ID
 */
const getCertificateForDownload = async (certificateId) => {
    try {
        const certificate = await certificate_model_1.default.findOne({ certificateId })
            .populate({
            path: 'course',
            select: 'title instructor',
            populate: { path: 'instructor', select: 'name signature role' }
        })
            .populate('user', 'name email')
            .lean();
        if (!certificate) {
            return {
                success: false,
                message: 'Certificate not found',
                errors: ['No certificate found with the provided ID']
            };
        }
        return {
            success: true,
            data: certificate,
            message: 'Certificate retrieved for download'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve certificate for download',
            errors: [error.message]
        };
    }
};
exports.getCertificateForDownload = getCertificateForDownload;
//# sourceMappingURL=certificate.service.js.map