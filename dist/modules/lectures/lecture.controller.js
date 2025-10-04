"use strict";
// src/modules/lectures/lecture.controller.ts
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
exports.reorderLecturesHandler = exports.getLecturesByChapterHandler = exports.getLectureHandler = exports.deleteLectureHandler = exports.updateLectureHandler = exports.createLectureHandler = void 0;
const lectureService = __importStar(require("./lecture.service"));
const catchAsync_1 = require("../../middlewares/catchAsync");
const common_1 = require("../../utils/common");
const response_1 = require("../../utils/response");
// --- CONTROLLER HANDLERS ---
exports.createLectureHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    const result = await lectureService.createLectureService(req.body, userId, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Lecture creation failed', 400, result.errors);
    }
    return (0, response_1.sendCreated)(res, result.data, 'Lecture created successfully');
});
exports.updateLectureHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!req.params.id) {
        return (0, response_1.sendError)(res, 'Lecture ID missing', 400);
    }
    const result = await lectureService.updateLectureService(req.params.id, req.body, userId, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Lecture update failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Lecture updated successfully');
});
exports.deleteLectureHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!req.params.id) {
        return (0, response_1.sendError)(res, 'Lecture ID missing', 400);
    }
    const result = await lectureService.deleteLectureService(req.params.id, userId, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Lecture deletion failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, undefined, 'Lecture deleted successfully');
});
exports.getLectureHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    // Authorization check placeholder for security logic
    const userRole = (0, common_1.getUserRole)(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;
    const result = await lectureService.getLectureByIdService(req.params.id, cacheKey, isEnrolled);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Lecture not found', 404, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Lecture retrieved successfully', 200, { cached: !!cacheKey });
});
exports.getLecturesByChapterHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const userRole = (0, common_1.getUserRole)(req);
    const isEnrolled = userRole === 'admin' || userRole === 'instructor' || false;
    const result = await lectureService.getLecturesByChapterService(req.params.chapterId, cacheKey, isEnrolled);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve lectures', 500, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Lectures retrieved successfully', 200, { cached: !!cacheKey });
});
exports.reorderLecturesHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    const { chapterId, order } = req.body;
    const result = await lectureService.reorderLecturesService(chapterId, order, userId, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Lecture reordering failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Lectures reordered successfully');
});
//# sourceMappingURL=lecture.controller.js.map