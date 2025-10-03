import { z } from "zod";
export declare const createLectureSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        course: z.ZodString;
        chapter: z.ZodString;
        videoUrl: z.ZodString;
        duration: z.ZodNumber;
        isPreview: z.ZodOptional<z.ZodBoolean>;
        resources: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateLectureSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        videoUrl: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        order: z.ZodOptional<z.ZodNumber>;
        isPreview: z.ZodOptional<z.ZodBoolean>;
        resources: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const lectureIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const chapterIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        chapterId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const reorderLecturesSchema: z.ZodObject<{
    body: z.ZodObject<{
        chapterId: z.ZodString;
        order: z.ZodArray<z.ZodObject<{
            lectureId: z.ZodString;
            order: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ICreateLectureBody = z.infer<typeof createLectureSchema>['body'];
export type IUpdateLectureBody = z.infer<typeof updateLectureSchema>['body'];
//# sourceMappingURL=lecture.validation.d.ts.map