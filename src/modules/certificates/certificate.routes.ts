// src/modules/certificates/certificate.routes.ts

import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
import {
  getUserCertificateHandler,
  getUserCertificatesHandler,
  getCertificateByIdHandler,
  verifyCertificateHandler,
  getCertificateStatsHandler,
  downloadCertificateHandler,
} from "./certificate.controller";
import {
  getCertificateSchema,
  getCertificateByIdSchema,
  getUserCertificatesSchema,
  verifyCertificateSchema,
  getCertificateStatsSchema,
} from "./certificate.validation";

const router = Router();
const CERTIFICATE_CACHE_BASE = 'certificates';

// --- READ ROUTES ---

// GET user's certificate for specific course
router.get(
    "/course/:courseId", 
    isAuthenticated,
    rbac('certificate:read'),
    cacheMiddleware(`${CERTIFICATE_CACHE_BASE}:courseId`, { param: 'courseId' }),
    validate(getCertificateSchema),
    getUserCertificateHandler
);

// GET all user certificates (authenticated user)
router.get(
    "/", 
    isAuthenticated,
    rbac('certificate:read'),
    validate(getUserCertificatesSchema),
    getUserCertificatesHandler
);

// GET certificate by certificate ID (public route for verification)
router.get(
    "/view/:certificateId", 
    isAuthenticated,
    rbac('certificate:read'),
    cacheMiddleware(`${CERTIFICATE_CACHE_BASE}:id`, { param: 'certificateId' }),
    validate(getCertificateByIdSchema),
    getCertificateByIdHandler
);

// GET certificate verification (public route)
router.get(
    "/verify/:certificateId", 
    isAuthenticated,
    rbac('certificate:verify'),
    cacheMiddleware(`certificate-verify:id`, { param: 'certificateId' }),
    validate(verifyCertificateSchema),
    verifyCertificateHandler
);

// GET certificate statistics (admin only)
router.get(
    "/stats", 
    isAuthenticated,
    rbac('certificate:stats'),
    cacheMiddleware(`certificate-stats`, { isList: true }),
    validate(getCertificateStatsSchema),
    getCertificateStatsHandler
);

// GET download certificate PDF (public route)
router.get(
    "/download/:certificateId", 
    downloadCertificateHandler
);

export default router;
