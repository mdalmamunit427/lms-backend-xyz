"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCourseOwnership = void 0;
const ownership_1 = require("../utils/ownership");
const common_1 = require("../utils/common");
const catchAsync_1 = require("./catchAsync");
const errorHandler_1 = require("../utils/errorHandler");
exports.requireCourseOwnership = (0, catchAsync_1.catchAsync)(async (req, res, next) => {
    const courseId = req.params.id;
    const userId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (!courseId) {
        throw (0, errorHandler_1.createError)('Course ID is required', 400);
    }
    await (0, ownership_1.validateCourseAndOwnership)(courseId, userId, userRole);
    next();
});
//# sourceMappingURL=courseOwnership.middleware.js.map