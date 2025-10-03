import { z } from 'zod';
export declare const createQuizSchema: z.ZodObject<{
    body: z.ZodObject<{
        lecture: z.ZodOptional<z.ZodString>;
        course: z.ZodOptional<z.ZodString>;
        chapter: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            question: z.ZodString;
            options: z.ZodArray<z.ZodString>;
            correctAnswer: z.ZodNumber;
            type: z.ZodOptional<z.ZodString>;
            points: z.ZodOptional<z.ZodNumber>;
            explanation: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        totalPoints: z.ZodOptional<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        passingScore: z.ZodOptional<z.ZodNumber>;
        order: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateQuizSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
        questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            question: z.ZodString;
            options: z.ZodArray<z.ZodString>;
            correctAnswer: z.ZodNumber;
            type: z.ZodOptional<z.ZodString>;
            points: z.ZodOptional<z.ZodNumber>;
            explanation: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const quizIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getChapterQuizzesSchema: z.ZodObject<{
    params: z.ZodObject<{
        chapterId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getCourseQuizzesSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const submitQuizAttemptSchema: z.ZodObject<{
    body: z.ZodObject<{
        answers: z.ZodArray<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getQuizResultsSchema: z.ZodObject<{
    params: z.ZodObject<{
        courseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ICreateQuizBody = z.infer<typeof createQuizSchema>['body'];
export type IUpdateQuizBody = z.infer<typeof updateQuizSchema>['body'];
export type ISubmitQuizAttemptBody = z.infer<typeof submitQuizAttemptSchema>['body'];
//# sourceMappingURL=quiz.validation.d.ts.map