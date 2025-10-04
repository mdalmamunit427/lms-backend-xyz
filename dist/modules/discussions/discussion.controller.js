"use strict";
// src/modules/discussions/discussion.controller.ts
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
exports.getUserDiscussionsHandler = exports.getCourseDiscussionsHandler = exports.getLectureDiscussionsHandler = exports.getDiscussionHandler = exports.deleteDiscussionHandler = exports.updateDiscussionHandler = exports.answerDiscussionHandler = exports.createDiscussionHandler = void 0;
const discussionService = __importStar(require("./discussion.service"));
const catchAsync_1 = require("../../middlewares/catchAsync");
const common_1 = require("../../utils/common");
const response_1 = require("../../utils/response");
const cache_1 = require("../../utils/cache");
// --- CONTROLLER HANDLERS ---
exports.createDiscussionHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const { lecture, question } = req.body;
    const result = await discussionService.createDiscussionService(userId, lecture, question);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Discussion creation failed', 400, result.errors);
    }
    return (0, response_1.sendCreated)(res, result.data, 'Discussion created successfully');
});
exports.answerDiscussionHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!req.params.id) {
        return (0, response_1.sendError)(res, 'Discussion ID missing', 400);
    }
    const { text } = req.body;
    // Check if user is instructor for the course
    const isInstructor = userRole === 'instructor' || userRole === 'admin';
    const result = await discussionService.answerQuestionService(req.params.id, userId, text, isInstructor);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Answer submission failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Answer submitted successfully');
});
exports.updateDiscussionHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!req.params.id) {
        return (0, response_1.sendError)(res, 'Discussion ID missing', 400);
    }
    const { question } = req.body;
    const result = await discussionService.updateDiscussionService(req.params.id, userId, question, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Discussion update failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Discussion updated successfully');
});
exports.deleteDiscussionHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!req.params.id) {
        return (0, response_1.sendError)(res, 'Discussion ID missing', 400);
    }
    const result = await discussionService.deleteDiscussionService(req.params.id, userId, userRole);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Discussion deletion failed', 400, result.errors);
    }
    return (0, response_1.sendSuccess)(res, undefined, 'Discussion deleted successfully');
});
exports.getDiscussionHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const result = await discussionService.getDiscussionByIdService(req.params.id, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Discussion not found', 404, result.errors);
    }
    return (0, response_1.sendSuccess)(res, result.data, 'Discussion retrieved successfully', 200, { cached: !!cacheKey });
});
exports.getLectureDiscussionsHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const { page, limit } = (0, common_1.getPaginationParams)(req);
    const hasAnswers = req.query.hasAnswers ? req.query.hasAnswers === 'true' : undefined;
    const options = {
        page,
        limit,
        hasAnswers
    };
    const result = await discussionService.getLectureDiscussionsService(req.params.lectureId, options, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve lecture discussions', 500, result.errors);
    }
    const { discussions, pagination } = result.data;
    return (0, response_1.sendPaginated)(res, discussions, pagination, 'Lecture discussions retrieved successfully', !!cacheKey);
});
exports.getCourseDiscussionsHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const cacheKey = req.cacheKey;
    if (!cacheKey) {
        return (0, response_1.sendError)(res, 'Cache key missing from request', 500);
    }
    const { page, limit } = (0, common_1.getPaginationParams)(req);
    const hasAnswers = req.query.hasAnswers ? req.query.hasAnswers === 'true' : undefined;
    const options = {
        page,
        limit,
        hasAnswers
    };
    const result = await discussionService.getCourseDiscussionsService(req.params.courseId, options, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve course discussions', 500, result.errors);
    }
    const { discussions, pagination } = result.data;
    return (0, response_1.sendPaginated)(res, discussions, pagination, 'Course discussions retrieved successfully', !!cacheKey);
});
exports.getUserDiscussionsHandler = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = (0, common_1.getUserId)(req);
    const { page, limit } = (0, common_1.getPaginationParams)(req);
    // Generate user-specific cache key
    const cacheKey = `discussions:user:userId=${userId}:page=${page}:limit=${limit}`;
    // Try to get from cache first
    const cachedData = await (0, cache_1.getCacheWithTTL)(cacheKey);
    if (cachedData && cachedData.data) {
        const { discussions, pagination } = cachedData.data;
        return (0, response_1.sendPaginated)(res, discussions, pagination, 'User discussions retrieved from cache', true);
    }
    const options = {
        page,
        limit
    };
    const result = await discussionService.getUserDiscussionsService(userId, options, cacheKey);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve user discussions', 500, result.errors);
    }
    const { discussions, pagination } = result.data;
    return (0, response_1.sendPaginated)(res, discussions, pagination, 'User discussions retrieved successfully', false);
});
//# sourceMappingURL=discussion.controller.js.map