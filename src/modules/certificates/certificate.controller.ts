// src/modules/certificates/certificate.controller.ts

import { Request, Response, NextFunction } from "express";
import * as certificateService from "./certificate.service";
import { AppError } from "../../utils/errorHandler";
import { UserRole } from "../../utils/ownership";
import { catchAsync } from "../../middlewares/catchAsync";
import { generateCertificatePDF, CertificateData } from "../../utils/pdfGenerator";
import { getUserId, getUserRole, getPaginationParams } from "../../utils/common";
import { sendSuccess, sendError, sendPaginated } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth";

// --- Type Definitions ---
interface CertificateAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        courseId?: string;
        certificateId?: string;
    };
    query: {
        page?: string;
        limit?: string;
        startDate?: string;
        endDate?: string;
        courseId?: string;
    };
    body: any; 
}

// --- CONTROLLER HANDLERS ---

export const getUserCertificateHandler = catchAsync(async (req: CertificateAuthRequest, res: Response) => {
    const userId = getUserId(req);
    
    if (!req.params.courseId) {
        return sendError(res, 'Course ID missing', 400);
    }

    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const result = await certificateService.getUserCertificateService(
        userId,
        req.params.courseId,
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Certificate not found', 404, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Certificate retrieved successfully', 200, { cached: !!cacheKey });
});

export const getUserCertificatesHandler = catchAsync(async (req: CertificateAuthRequest, res: Response) => {
    const userId = getUserId(req);

    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const { page, limit } = getPaginationParams(req);
    const options = {
        page,
        limit
    };

    const result = await certificateService.getUserCertificatesService(
        userId,
        options,
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve certificates', 500, result.errors);
    }
    
    const { data, pagination } = result.data!;
    return sendPaginated(res, data, pagination, 'Certificates retrieved successfully', !!cacheKey);
});

export const getCertificateByIdHandler = catchAsync(async (req: CertificateAuthRequest, res: Response) => {
    if (!req.params.certificateId) {
        return sendError(res, 'Certificate ID missing', 400);
    }

    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const result = await certificateService.getCertificateByIdService(
        req.params.certificateId,
        cacheKey
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Certificate not found', 404, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Certificate retrieved successfully', 200, { cached: !!cacheKey });
});

export const verifyCertificateHandler = catchAsync(async (req: CertificateAuthRequest, res: Response) => {
    if (!req.params.certificateId) {
        return sendError(res, 'Certificate ID missing', 400);
    }

    const result = await certificateService.verifyCertificateService(
        req.params.certificateId
    );
    
    if (!result.success) {
        return sendError(res, result.message || 'Certificate verification failed', 400, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Certificate verification completed');
});

export const getCertificateStatsHandler = catchAsync(async (req: CertificateAuthRequest, res: Response) => {
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    
    // Only admins can view certificate statistics
    if (userRole !== 'admin') {
        return sendError(res, 'Insufficient permissions', 403);
    }

    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return sendError(res, 'Cache key missing from request', 500);
    }

    const { startDate, endDate, courseId } = req.query;
    const options = {
        startDate,
        endDate,
        courseId
    };

    const result = await certificateService.getCertificateStatsService(options, cacheKey);
    
    if (!result.success) {
        return sendError(res, result.message || 'Failed to retrieve certificate stats', 500, result.errors);
    }
    
    return sendSuccess(res, result.data, 'Certificate stats retrieved successfully', 200, { cached: !!cacheKey });
});

// Download certificate as PDF
export const downloadCertificateHandler = catchAsync(async (req: Request, res: Response) => {
    const { certificateId } = req.params;
    
    if (!certificateId) {
        return sendError(res, 'Certificate ID is required', 400);
    }

    try {
        // Get certificate data
        const result = await certificateService.getCertificateForDownload(certificateId);
        
        if (!result.success || !result.data) {
            return sendError(res, 'Certificate not found', 404);
        }

        const certificate = result.data;

        // Prepare certificate data for PDF generation
        const instructorSignatureUrl = (certificate.course as any)?.instructor?.signature?.url as string | undefined;
        const adminSignatureUrl = process.env.PLATFORM_ADMIN_SIGNATURE_URL;

        const certificateData: CertificateData = {
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
        const pdfBuffer = await generateCertificatePDF(certificateData);
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificateId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF buffer
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        return sendError(res, 'Failed to generate certificate PDF', 500);
    }
});
