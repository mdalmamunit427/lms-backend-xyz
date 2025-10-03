import { z } from 'zod';
export declare const createChapterSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        course: z.ZodString;
        order: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createChapterWithLecturesSchema: z.ZodObject<{
    body: z.ZodObject<{
        chapter: z.ZodObject<{
            title: z.ZodString;
            course: z.ZodString;
            order: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        lectures: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            videoUrl: z.ZodString;
            duration: z.ZodNumber;
            isPreview: z.ZodOptional<z.ZodBoolean>;
            resources: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateChapterSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getChapterSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getCourseChaptersSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const reorderChaptersWithLecturesSchema: z.ZodObject<{
    body: z.ZodObject<{
        courseId: z.ZodString;
        order: z.ZodArray<z.ZodObject<{
            chapterId: z.ZodString;
            order: z.ZodNumber;
            lectures: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
                lectureId: z.ZodString;
                order: z.ZodNumber;
            }, z.core.$strip>>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const bulkUpdateChaptersSchema: z.ZodObject<{
    body: z.ZodObject<{
        courseId: z.ZodString;
        chapters: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            order: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=chapter.validation.d.ts.map