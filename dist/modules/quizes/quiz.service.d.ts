import { UserRole } from "../../utils/ownership";
import { IQuiz } from "./quiz.model";
import { ICreateQuizBody, IUpdateQuizBody, ISubmitQuizAttemptBody } from "./quiz.validation";
import { ServiceResponse } from "../../@types/api";
/**
 * Create a new quiz with smart order conflict resolution
 */
export declare const createQuizService: (data: ICreateQuizBody, userId: string, userRole: UserRole) => Promise<ServiceResponse<IQuiz>>;
/**
 * Update quiz with smart order conflict resolution
 */
export declare const updateQuizService: (id: string, data: IUpdateQuizBody, userId: string, userRole: UserRole) => Promise<ServiceResponse<IQuiz>>;
/**
 * Delete quiz
 */
export declare const deleteQuizService: (id: string, userId: string, userRole: UserRole) => Promise<ServiceResponse<IQuiz>>;
/**
 * Get quiz by ID with security filtering
 */
export declare const getQuizByIdService: (id: string, cacheKey: string, userId: string, userRole: string) => Promise<ServiceResponse<any>>;
/**
 * Submit quiz attempt
 */
export declare const submitQuizAttemptService: (userId: string, quizId: string, data: ISubmitQuizAttemptBody) => Promise<ServiceResponse<any>>;
/**
 * Get quiz results for a course
 */
export declare const getQuizResultsService: (userId: string, courseId: string) => Promise<ServiceResponse<any>>;
//# sourceMappingURL=quiz.service.d.ts.map