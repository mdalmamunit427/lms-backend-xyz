import { Request, Response } from "express";
export declare const createCheckoutSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const handleStripeWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getEnrolledCoursesController: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getEnrolledCourseController: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const checkEnrollmentController: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=enrollment.controller.d.ts.map