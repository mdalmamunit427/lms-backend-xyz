import { ClientSession } from 'mongoose';
import { IQuiz } from './quiz.model';
export type QuizQueryOptions = {
    page?: number;
    limit?: number;
    chapterId?: string;
    courseId?: string;
};
export declare const findQuizById: (quizId: string, session?: ClientSession) => Promise<IQuiz | null>;
export declare const findQuizzesByChapter: (chapterId: string, session?: ClientSession) => Promise<IQuiz[]>;
export declare const findQuizzesByCourse: (courseId: string, session?: ClientSession) => Promise<IQuiz[]>;
export declare const countQuizzesByChapter: (chapterId: string, session?: ClientSession) => Promise<number>;
export declare const countQuizzesByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createQuiz: (data: Partial<IQuiz>, session?: ClientSession) => Promise<IQuiz>;
export declare const updateQuizById: (quizId: string, updateData: Partial<IQuiz>, session?: ClientSession) => Promise<IQuiz | null>;
export declare const deleteQuizById: (quizId: string, session?: ClientSession) => Promise<IQuiz | null>;
export declare const bulkUpdateQuizzes: (operations: Array<{
    quizId: string;
    order: number;
}>, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteQuizzesByChapter: (chapterId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteQuizzesByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateQuizStats: (courseId: string) => Promise<any>;
//# sourceMappingURL=quiz.repository.d.ts.map