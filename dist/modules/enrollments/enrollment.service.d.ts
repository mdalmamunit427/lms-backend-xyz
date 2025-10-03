import stripe from "stripe";
import { ICoupon } from "../coupons/coupon.model";
import { ServiceResponse } from "../../@types/api";
export declare const processEnrollment: ({ studentId, courseId, amountPaid, paymentStatus, couponId, stripeSessionId, }: {
    studentId: string;
    courseId: string;
    amountPaid: number;
    paymentStatus: "paid" | "free";
    couponId?: string;
    stripeSessionId?: string;
}) => Promise<ServiceResponse<any>>;
export declare const calculateFinalPrice: (courseId: string, couponCode?: string) => Promise<ServiceResponse<{
    finalPrice: number;
    coupon: ICoupon | null;
    course: any;
}>>;
export declare const createStripeSessionService: (courseId: string, studentId: string, finalPrice: number, couponId?: string) => Promise<ServiceResponse<{
    sessionId: string;
    sessionUrl: string | null;
}>>;
export declare const handleStripeWebhookService: (event: stripe.Event) => Promise<ServiceResponse<boolean>>;
export declare const getEnrolledCoursesByUser: (userId: string) => Promise<ServiceResponse<any>>;
export declare const getEnrolledCourseDetails: (courseId: string, userId: string) => Promise<ServiceResponse<any>>;
export declare const checkEnrollmentStatus: (courseId: string, userId: string) => Promise<ServiceResponse<boolean>>;
//# sourceMappingURL=enrollment.service.d.ts.map