import { Request, Response } from "express";
import Stripe from "stripe";
import { catchAsync } from "../../middlewares/catchAsync";
import { AuthRequest } from "../../middlewares/auth";
import Enrollment from "./enrollment.model";
import { Types } from "mongoose";
import { AppError } from "../../utils/errorHandler";
import { getCache, setCache } from "../../utils/cache";
import {
  calculateFinalPrice,
  createStripeSessionService,
  handleStripeWebhookService,
  processEnrollment,
  getEnrolledCoursesByUser,
  getEnrolledCourseDetails,
  checkEnrollmentStatus,
} from "./enrollment.service";
import { ICoupon } from "../coupons/coupon.model";
import { getUserId, getUserRole } from "../../utils/common";
import { sendSuccess, sendError, sendCreated } from "../../utils/response";

export const createCheckoutSession = catchAsync(async (req: AuthRequest, res: Response) => {
    const { courseId, couponCode } = req.body;
    const studentId = getUserId(req);

    const existingEnrollment = await Enrollment.findOne({
      student: new Types.ObjectId(studentId),
      course: new Types.ObjectId(courseId),
    });
    if (existingEnrollment) {
      return sendError(res, 'You are already enrolled in this course.', 400);
    }

    // 1. Get the result from the service
    const result = await calculateFinalPrice(courseId, couponCode);
    if (!result.success) {
      return sendError(res, result.message || 'Price calculation failed', 400, result.errors);
    }

    const { finalPrice, coupon } = result.data!;
    const validCoupon = coupon as (ICoupon & { _id: Types.ObjectId }) | null;
    const couponId = validCoupon ? validCoupon._id.toString() : undefined;

    if (finalPrice <= 0) {
      const enrollmentResult = await processEnrollment({
        studentId,
        courseId,
        amountPaid: 0,
        paymentStatus: 'free',
        couponId,
      });
      
      if (!enrollmentResult.success) {
        return sendError(res, enrollmentResult.message || 'Free enrollment failed', 400, enrollmentResult.errors);
      }
      
      return sendSuccess(res, undefined, 'Free enrollment successful');
    }

    const stripeResult = await createStripeSessionService(
      courseId,
      studentId,
      finalPrice * 100,
      couponId,
    );

    if (!stripeResult.success) {
      return sendError(res, stripeResult.message || 'Stripe session creation failed', 400, stripeResult.errors);
    }

    const { sessionId, sessionUrl } = stripeResult.data!;
    return sendSuccess(res, { id: sessionId, url: sessionUrl }, 'Checkout session created successfully');
});

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    console.error("❌ Webhook signature missing:", signature);
    return sendError(res, 'Webhook signature missing', 400);
  }

  try {
    const event: Stripe.Event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    const result = await handleStripeWebhookService(event);
    
    if (!result.success) {
      console.error("❌ Webhook processing failed:", result.message);
      return sendError(res, result.message || 'Webhook processing failed', 500, result.errors);
    }
    
    return sendSuccess(res, { received: true }, 'Webhook processed successfully');
  } catch (err: any) {
    if (err.type === "StripeSignatureVerificationError") {
      console.error("❌ Webhook signature verification failed:", err.message);
      return sendError(res, `Webhook Error: ${err.message}`, 400);
    }
    console.error("❌ Webhook processing failed:", err.message);
    return sendError(res, 'Failed to process webhook', 500);
  }
};

// === ENROLLED COURSES CONTROLLERS ===

// Get all enrolled courses for a user
export const getEnrolledCoursesController = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId;
  
  if (!userId) {
    return sendError(res, 'User ID is required', 400);
  }
  
  // Verify the user is requesting their own courses or is admin
  const requestingUserId = getUserId(req);
  const userRole = getUserRole(req);
  
  if (requestingUserId !== userId && userRole !== 'admin') {
    return sendError(res, 'Unauthorized to access these courses', 403);
  }

  const result = await getEnrolledCoursesByUser(userId);
  
  if (!result.success) {
    return sendError(res, result.message || 'Failed to retrieve enrolled courses', 500, result.errors);
  }
  
  return sendSuccess(res, {
    ...result.data,
    count: result.data?.enrolledCourses?.length || 0
  }, 'Enrolled courses retrieved successfully');
});

// Get specific enrolled course with full content
export const getEnrolledCourseController = catchAsync(async (req: AuthRequest, res: Response) => {
  const courseId = req.params.courseId;
  
  if (!courseId) {
    return sendError(res, 'Course ID is required', 400);
  }
  
  const userId = getUserId(req);
  
  // Generate user-specific cache key
  const cacheKey = `enrolled-course-details:courseId=${courseId}:userId=${userId}`;
  
  // Try to get from cache first
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return sendSuccess(res, { 
      course: { ...cachedData, cached: true }
    }, 'Enrolled course retrieved from cache');
  }
  
  const result = await getEnrolledCourseDetails(courseId, userId);
  
  if (!result.success) {
    return sendError(res, result.message || 'Failed to retrieve enrolled course', 500, result.errors);
  }
  
  // Cache the result for 5 minutes
  await setCache(cacheKey, result.data, 300);
  
  return sendSuccess(res, { 
    course: { ...result.data, cached: false }
  }, 'Enrolled course retrieved successfully');
});

// Check enrollment status for a course
export const checkEnrollmentController = catchAsync(async (req: AuthRequest, res: Response) => {
  const courseId = req.params.courseId;
  
  if (!courseId) {
    return sendError(res, 'Course ID is required', 400);
  }
  
  const userId = getUserId(req);
  
  const result = await checkEnrollmentStatus(courseId, userId);
  
  if (!result.success) {
    return sendError(res, result.message || 'Failed to check enrollment status', 500, result.errors);
  }
  
  return sendSuccess(res, { 
    isEnrolled: result.data 
  }, 'Enrollment status checked successfully');
});
