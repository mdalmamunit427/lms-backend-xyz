"use strict";
// src/modules/certificates/certificate.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const cacheMiddleware_1 = require("../../middlewares/cacheMiddleware");
const certificate_controller_1 = require("./certificate.controller");
const certificate_validation_1 = require("./certificate.validation");
const router = (0, express_1.Router)();
const CERTIFICATE_CACHE_BASE = 'certificates';
// --- READ ROUTES ---
// GET user's certificate for specific course
router.get("/course/:courseId", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('certificate:read'), (0, cacheMiddleware_1.cacheMiddleware)(`${CERTIFICATE_CACHE_BASE}:courseId`, { param: 'courseId' }), (0, validate_middleware_1.validate)(certificate_validation_1.getCertificateSchema), certificate_controller_1.getUserCertificateHandler);
// GET all user certificates (authenticated user)
router.get("/", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('certificate:read'), (0, validate_middleware_1.validate)(certificate_validation_1.getUserCertificatesSchema), certificate_controller_1.getUserCertificatesHandler);
// GET certificate by certificate ID (public route for verification)
router.get("/view/:certificateId", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('certificate:read'), (0, cacheMiddleware_1.cacheMiddleware)(`${CERTIFICATE_CACHE_BASE}:id`, { param: 'certificateId' }), (0, validate_middleware_1.validate)(certificate_validation_1.getCertificateByIdSchema), certificate_controller_1.getCertificateByIdHandler);
// GET certificate verification (public route)
router.get("/verify/:certificateId", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('certificate:verify'), (0, cacheMiddleware_1.cacheMiddleware)(`certificate-verify:id`, { param: 'certificateId' }), (0, validate_middleware_1.validate)(certificate_validation_1.verifyCertificateSchema), certificate_controller_1.verifyCertificateHandler);
// GET certificate statistics (admin only)
router.get("/stats", auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)('certificate:stats'), (0, cacheMiddleware_1.cacheMiddleware)(`certificate-stats`, { isList: true }), (0, validate_middleware_1.validate)(certificate_validation_1.getCertificateStatsSchema), certificate_controller_1.getCertificateStatsHandler);
// GET download certificate PDF (public route)
router.get("/download/:certificateId", certificate_controller_1.downloadCertificateHandler);
exports.default = router;
//# sourceMappingURL=certificate.routes.js.map