"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnrollmentController = exports.getEnrolledCourseController = exports.getEnrolledCoursesController = exports.handleStripeWebhook = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const catchAsync_1 = require("../../middlewares/catchAsync");
const enrollment_model_1 = __importDefault(require("./enrollment.model"));
const mongoose_1 = require("mongoose");
const cache_1 = require("../../utils/cache");
const enrollment_service_1 = require("./enrollment.service");
const common_1 = require("../../utils/common");
const response_1 = require("../../utils/response");
exports.createCheckoutSession = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { courseId, couponCode } = req.body;
    const studentId = (0, common_1.getUserId)(req);
    const existingEnrollment = await enrollment_model_1.default.findOne({
        student: new mongoose_1.Types.ObjectId(studentId),
        course: new mongoose_1.Types.ObjectId(courseId),
    });
    if (existingEnrollment) {
        return (0, response_1.sendError)(res, 'You are already enrolled in this course.', 400);
    }
    // 1. Get the result from the service
    const result = await (0, enrollment_service_1.calculateFinalPrice)(courseId, couponCode);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Price calculation failed', 400, result.errors);
    }
    const { finalPrice, coupon } = result.data;
    const validCoupon = coupon;
    const couponId = validCoupon ? validCoupon._id.toString() : undefined;
    if (finalPrice <= 0) {
        const enrollmentResult = await (0, enrollment_service_1.processEnrollment)({
            studentId,
            courseId,
            amountPaid: 0,
            paymentStatus: 'free',
            couponId,
        });
        if (!enrollmentResult.success) {
            return (0, response_1.sendError)(res, enrollmentResult.message || 'Free enrollment failed', 400, enrollmentResult.errors);
        }
        return (0, response_1.sendSuccess)(res, undefined, 'Free enrollment successful');
    }
    const stripeResult = await (0, enrollment_service_1.createStripeSessionService)(courseId, studentId, finalPrice * 100, couponId);
    if (!stripeResult.success) {
        return (0, response_1.sendError)(res, stripeResult.message || 'Stripe session creation failed', 400, stripeResult.errors);
    }
    const { sessionId, sessionUrl } = stripeResult.data;
    return (0, response_1.sendSuccess)(res, { id: sessionId, url: sessionUrl }, 'Checkout session created successfully');
});
const handleStripeWebhook = async (req, res) => {
    const stripeClient = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
    const signature = req.headers["stripe-signature"];
    if (!signature) {
        console.error("❌ Webhook signature missing:", signature);
        return (0, response_1.sendError)(res, 'Webhook signature missing', 400);
    }
    try {
        const event = stripeClient.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
        const result = await (0, enrollment_service_1.handleStripeWebhookService)(event);
        if (!result.success) {
            console.error("❌ Webhook processing failed:", result.message);
            return (0, response_1.sendError)(res, result.message || 'Webhook processing failed', 500, result.errors);
        }
        return (0, response_1.sendSuccess)(res, { received: true }, 'Webhook processed successfully');
    }
    catch (err) {
        if (err.type === "StripeSignatureVerificationError") {
            console.error("❌ Webhook signature verification failed:", err.message);
            return (0, response_1.sendError)(res, `Webhook Error: ${err.message}`, 400);
        }
        console.error("❌ Webhook processing failed:", err.message);
        return (0, response_1.sendError)(res, 'Failed to process webhook', 500);
    }
};
exports.handleStripeWebhook = handleStripeWebhook;
// === ENROLLED COURSES CONTROLLERS ===
// Get all enrolled courses for a user
exports.getEnrolledCoursesController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User ID is required', 400);
    }
    // Verify the user is requesting their own courses or is admin
    const requestingUserId = (0, common_1.getUserId)(req);
    const userRole = (0, common_1.getUserRole)(req);
    if (requestingUserId !== userId && userRole !== 'admin') {
        return (0, response_1.sendError)(res, 'Unauthorized to access these courses', 403);
    }
    const result = await (0, enrollment_service_1.getEnrolledCoursesByUser)(userId);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve enrolled courses', 500, result.errors);
    }
    return (0, response_1.sendSuccess)(res, {
        ...result.data,
        count: result.data?.enrolledCourses?.length || 0
    }, 'Enrolled courses retrieved successfully');
});
// Get specific enrolled course with full content
exports.getEnrolledCourseController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const courseId = req.params.courseId;
    if (!courseId) {
        return (0, response_1.sendError)(res, 'Course ID is required', 400);
    }
    const userId = (0, common_1.getUserId)(req);
    // Generate user-specific cache key
    const cacheKey = `enrolled-course-details:courseId=${courseId}:userId=${userId}`;
    // Try to get from cache first
    const cachedData = await (0, cache_1.getCache)(cacheKey);
    if (cachedData) {
        return (0, response_1.sendSuccess)(res, {
            course: { ...cachedData, cached: true }
        }, 'Enrolled course retrieved from cache');
    }
    const result = await (0, enrollment_service_1.getEnrolledCourseDetails)(courseId, userId);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to retrieve enrolled course', 500, result.errors);
    }
    // Cache the result for 5 minutes
    await (0, cache_1.setCache)(cacheKey, result.data, 300);
    return (0, response_1.sendSuccess)(res, {
        course: { ...result.data, cached: false }
    }, 'Enrolled course retrieved successfully');
});
// Check enrollment status for a course
exports.checkEnrollmentController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const courseId = req.params.courseId;
    if (!courseId) {
        return (0, response_1.sendError)(res, 'Course ID is required', 400);
    }
    const userId = (0, common_1.getUserId)(req);
    const result = await (0, enrollment_service_1.checkEnrollmentStatus)(courseId, userId);
    if (!result.success) {
        return (0, response_1.sendError)(res, result.message || 'Failed to check enrollment status', 500, result.errors);
    }
    return (0, response_1.sendSuccess)(res, {
        isEnrolled: result.data
    }, 'Enrollment status checked successfully');
});
//# sourceMappingURL=enrollment.controller.js.map