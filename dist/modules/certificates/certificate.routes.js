"use strict";
// src/modules/certificates/certificate.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificate_controller_1 = require("./certificate.controller");
const certificate_validation_1 = require("./certificate.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const router = (0, express_1.Router)();
const CERTIFICATE_CACHE_BASE = 'certificates';
// --- READ ROUTES ---
// GET user's certificate for specific course
router.get("/course/:courseId", ...(0, middlewareStacks_1.getCacheStack)(`${CERTIFICATE_CACHE_BASE}:courseId`, { param: 'courseId' }, certificate_validation_1.getCertificateSchema), certificate_controller_1.getUserCertificateHandler);
// GET all user certificates (authenticated user)
router.get("/", ...(0, middlewareStacks_1.getCacheStack)(`${CERTIFICATE_CACHE_BASE}:user`, { param: 'user', isList: true }, certificate_validation_1.getUserCertificatesSchema), certificate_controller_1.getUserCertificatesHandler);
// GET certificate by certificate ID (public route for verification)
router.get("/view/:certificateId", ...(0, middlewareStacks_1.getCacheStack)(`${CERTIFICATE_CACHE_BASE}:id`, { param: 'certificateId' }, certificate_validation_1.getCertificateByIdSchema), certificate_controller_1.getCertificateByIdHandler);
// GET certificate verification (public route)
router.get("/verify/:certificateId", ...(0, middlewareStacks_1.getCacheStack)(`certificate-verify:id`, { param: 'certificateId' }, certificate_validation_1.verifyCertificateSchema), certificate_controller_1.verifyCertificateHandler);
// GET certificate statistics (admin only)
router.get("/stats", ...(0, middlewareStacks_1.getCacheStack)(`certificate-stats`, { isList: true }, certificate_validation_1.getCertificateStatsSchema), certificate_controller_1.getCertificateStatsHandler);
// GET download certificate PDF (public route)
router.get("/download/:certificateId", certificate_controller_1.downloadCertificateHandler);
exports.default = router;
//# sourceMappingURL=certificate.routes.js.map