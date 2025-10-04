import mongoose from 'mongoose';
import { IDiscussion } from "./discussion.model";
import { ServiceResponse } from "../../@types/api";
/**
 * Create discussion
 */
export declare const createDiscussionService: (userId: string, lectureId: string, question: string) => Promise<ServiceResponse<IDiscussion>>;
/**
 * Answer question
 */
export declare const answerQuestionService: (discussionId: string, userId: string, text: string, isInstructor?: boolean) => Promise<ServiceResponse<IDiscussion>>;
/**
 * Update discussion
 */
export declare const updateDiscussionService: (discussionId: string, userId: string, question: string, userRole?: string) => Promise<ServiceResponse<IDiscussion>>;
/**
 * Delete discussion
 */
export declare const deleteDiscussionService: (discussionId: string, userId: string, userRole?: string) => Promise<ServiceResponse<any>>;
/**
 * Get discussion by ID with caching
 */
export declare const getDiscussionByIdService: (id: string, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get lecture discussions with caching
 */
export declare const getLectureDiscussionsService: (lectureId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get course discussions with caching
 */
export declare const getCourseDiscussionsService: (courseId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get user discussions with caching
 */
export declare const getUserDiscussionsService: (userId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
export declare const createDiscussion: (userId: string, lectureId: string, question: string) => Promise<ServiceResponse<IDiscussion>>;
export declare const answerQuestion: (discussionId: string, userId: string, text: string, isInstructor?: boolean) => Promise<ServiceResponse<IDiscussion>>;
export declare const getLectureDiscussions: (lectureId: string) => mongoose.Query<(mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
})[], mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, {}, IDiscussion, "find", {}>;
export declare const getCourseDiscussions: (courseId: string) => mongoose.Query<(mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
})[], mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, {}, IDiscussion, "find", {}>;
export declare const getDiscussionById: (discussionId: string) => mongoose.Query<(mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
}) | null, mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, {}, IDiscussion, "findOne", {}>;
export declare const updateDiscussion: (discussionId: string, userId: string, question: string, userRole?: string) => Promise<ServiceResponse<IDiscussion>>;
export declare const deleteDiscussion: (discussionId: string, userId: string, userRole?: string) => Promise<ServiceResponse<any>>;
export declare const getUserDiscussions: (userId: string) => mongoose.Query<(mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
})[], mongoose.Document<unknown, {}, IDiscussion, {}, {}> & IDiscussion & Required<{
    _id: unknown;
}> & {
    __v: number;
}, {}, IDiscussion, "find", {}>;
//# sourceMappingURL=discussion.service.d.ts.map