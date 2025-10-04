"use strict";
// src/modules/certificates/certificate.controller.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadCertificateHandler = exports.getCertificateStatsHandler = exports.verifyCertificateHandler = exports.getCertificateByIdHandler = exports.getUserCertificatesHandler = exports.getUserCertificateHandler = void 0;
const certificateService = __importStar(require("./certificate.service"));
const catchAsync_1 = require("../../middlewares/catchAsync");
const pdfGenerator_1 = require("../../utils/pdfGenerator");
const common_1 = require("../../utils/common");
const response_1 = require("../../utils/response");
const cache_1 = require("../../utils/cache");
// --- CONTROLLER HANDLERS ---
exports.getUserCertificateHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    if (!req.params.courseId) {
        return (0, response_1.sendError)(res, 'Course ID missing', 400);
    }
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const result = await certificateService.getUserCertificateService(userId, req.params.courseId, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Certificate not found', 404, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Certificate retrieved successfully', 200, { cached: !!cacheKey });
});
exports.getUserCertificatesHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const { page, limit } = (0, common_1.getPaginationParams)(req);
    // Generate cache key manually for user-specific data
    const cacheKey = `certificates:user:${userId}:page:${page}:limit:${limit}`;
    // Try to get from cache first
    const cachedData = await (0, cache_1.getCacheWithTTL)(cacheKey);
    if (cachedData) {
        const { certificates, pagination } = cachedData.data;
        return (0, response_1.sendPaginated)(res, certificates, pagination, 'Certificates retrieved successfully', true);
    }
    const options = {
        page,
        limit
    };
    const result = await certificateService.getUserCertificatesService(userId, options, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve certificates', 500, result.errors);
    }
    const { data, pagination } = result.data;
    return (0, response_1.sendPaginated)(res, data, pagination, 'Certificates retrieved successfully', false);
});
exports.getCertificateByIdHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.params.certificateId) {
        return (0, response_1.sendError)(res, 'Certificate ID missing', 400);
    }
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const result = await certificateService.getCertificateByIdService(req.params.certificateId, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Certificate not found', 404, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Certificate retrieved successfully', 200, { cached: !!cacheKey });
});
exports.verifyCertificateHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    if (!req.params.certificateId) {
        return (0, response_1.sendError)(res, 'Certificate ID missing', 400);
    }
    const result = await certificateService.verifyCertificateService(req.params.certificateId);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Certificate verification failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Certificate verification completed');
});
exports.getCertificateStatsHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    // Only admins can view certificate statistics
    if (userRole !== 'admin') {
        return (0, response_1.sendError)(res, 'Insufficient permissions', 403);
    }
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const { startDate, endDate, courseId } = req.query;
    const options = {
        startDate,
        endDate,
        courseId
    };
    const result = await certificateService.getCertificateStatsService(options, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve certificate stats', 500, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Certificate stats retrieved successfully', 200, { cached: !!cacheKey });
});
// Download certificate as PDF
exports.downloadCertificateHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { certificateId } = req.params;
    if (!certificateId) {
        return (0, response_1.sendError)(res, 'Certificate ID is required', 400);
    }
    try {
        // Get certificate data
        const result = await certificateService.getCertificateForDownload(certificateId);
        if (!result.success || !result.data) {
            return (0, response_1.sendError)(res, 'Certificate not found', 404);
        }
        const certificate = result.data;
        // Prepare certificate data for PDF generation
        const instructorSignatureUrl = certificate.course?.instructor?.signature?.url;
        const adminSignatureUrl = process.env.PLATFORM_ADMIN_SIGNATURE_URL;
        const certificateData = {
            studentName: certificate.user.name,
            courseTitle: certificate.course.title,
            instructorName: certificate.course.instructor?.name || "Course Instructor",
            certificateId: certificate.certificateId,
            issueDate: new Date(certificate.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            completionDate: new Date(certificate.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            instructorSignatureUrl: instructorSignatureUrl,
            adminSignatureUrl: adminSignatureUrl,
            adminName: 'Platform Administrator'
        };
        // Generate PDF
        const pdfBuffer = await (0, pdfGenerator_1.generateCertificatePDF)(certificateData);
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificateId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        // Send PDF buffer
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('PDF generation error:', error);
        return (0, response_1.sendError)(res, 'Failed to generate certificate PDF', 500);
    }
});
//# sourceMappingURL=certificate.controller.js.map