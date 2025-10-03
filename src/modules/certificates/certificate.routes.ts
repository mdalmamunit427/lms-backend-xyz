// src/modules/certificates/certificate.routes.ts

import { Router } from "express";
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
import { getCacheStack } from "../../utils/middlewareStacks";

const router = Router();
const CERTIFICATE_CACHE_BASE = 'certificates';

// --- READ ROUTES ---

// GET user's certificate for specific course
router.get(
    "/course/:courseId", 
    ...getCacheStack(`${CERTIFICATE_CACHE_BASE}:courseId`, { param: 'courseId' }, getCertificateSchema),
    getUserCertificateHandler
);

// GET all user certificates (authenticated user)
router.get(
    "/", 
    ...getCacheStack(`${CERTIFICATE_CACHE_BASE}:user`, { param: 'user', isList: true }, getUserCertificatesSchema),
    getUserCertificatesHandler
);

// GET certificate by certificate ID (public route for verification)
router.get(
    "/view/:certificateId", 
    ...getCacheStack(`${CERTIFICATE_CACHE_BASE}:id`, { param: 'certificateId' }, getCertificateByIdSchema),
    getCertificateByIdHandler
);

// GET certificate verification (public route)
router.get(
    "/verify/:certificateId", 
    ...getCacheStack(`certificate-verify:id`, { param: 'certificateId' }, verifyCertificateSchema),
    verifyCertificateHandler
);

// GET certificate statistics (admin only)
router.get(
    "/stats", 
    ...getCacheStack(`certificate-stats`, { isList: true }, getCertificateStatsSchema),
    getCertificateStatsHandler
);

// GET download certificate PDF (public route)
router.get(
    "/download/:certificateId", 
    downloadCertificateHandler
);

export default router;
