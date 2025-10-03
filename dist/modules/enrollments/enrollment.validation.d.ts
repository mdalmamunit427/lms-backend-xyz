import { z } from 'zod';
export declare const createCheckoutSessionSchema: z.ZodObject<{
    body: z.ZodObject<{
        courseId: z.ZodString;
        couponCode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getUserEnrolledCoursesSchema: z.ZodObject<{
    params: z.ZodObject<{
        userId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getEnrolledCourseDetailsSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=enrollment.validation.d.ts.map