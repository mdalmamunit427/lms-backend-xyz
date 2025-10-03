"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCourseOwnership = void 0;
const ownership_1 = require("../utils/ownership");
const common_1 = require("../utils/common");
const catchAsync_1 = require("./catchAsync");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Middleware to validate course ownership for analytics and statistics routes.
 * Only the course instructor or admin can access course analytics/stats.
 */
exports.requireCourseOwnership = (0, catchAsync_1.catchAsync)(async (req, res, next) => {
    const courseId = req.params.id;
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!courseId) {
        return next(new Error('Course ID is required'));
    }
    // Start a session for the ownership validation
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            await (0, ownership_1.validateCourseAndOwnership)(courseId, userId, userRole, session);
        });
        // If validation passes, continue to the next middleware/controller
        next();
    }
    catch (error) {
        next(error);
    }
    finally {
        await session.endSession();
    }
});
//# sourceMappingURL=courseOwnership.middleware.js.map