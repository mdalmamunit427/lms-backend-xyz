"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnrolledCourseDetailsSchema = exports.getUserEnrolledCoursesSchema = exports.createCheckoutSessionSchema = void 0;
const zod_1 = require("zod");
exports.createCheckoutSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: zod_1.z.string().min(1, 'Course ID is required.'),
        couponCode: zod_1.z.string().optional(),
    }),
});
exports.getUserEnrolledCoursesSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1, 'User ID is required.'),
    }),
});
exports.getEnrolledCourseDetailsSchema = zod_1.z.object({
    params: zod_1.z.object({
        courseId: zod_1.z.string().min(1, 'Course ID is required.'),
    }),
});
//# sourceMappingURL=enrollment.validation.js.map