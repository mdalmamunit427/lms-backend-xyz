import { z } from 'zod';
export declare const updateLectureProgressSchema: z.ZodObject<{
    params: z.ZodObject<{
        lectureId: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        progressPercentage: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getCourseProgressSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getUserDashboardSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodString>;
        limit: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const getCourseCompletionStatsSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type IUpdateLectureProgressBody = z.infer<typeof updateLectureProgressSchema>['body'];
export type IUpdateLectureProgressParams = z.infer<typeof updateLectureProgressSchema>['params'];
//# sourceMappingURL=progress.validation.d.ts.map