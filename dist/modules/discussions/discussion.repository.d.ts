import { ClientSession } from 'mongoose';
import { IDiscussion } from './discussion.model';
export type DiscussionQueryOptions = {
    page?: number;
    limit?: number;
    userId?: string;
    lectureId?: string;
    courseId?: string;
    hasAnswers?: boolean;
};
export declare const findDiscussionById: (discussionId: string, session?: ClientSession) => Promise<IDiscussion | null>;
export declare const findDiscussionsByLecture: (lectureId: string, options?: DiscussionQueryOptions, session?: ClientSession) => Promise<IDiscussion[]>;
export declare const findDiscussionsByCourse: (courseId: string, options?: DiscussionQueryOptions, session?: ClientSession) => Promise<IDiscussion[]>;
export declare const findDiscussionsByUser: (userId: string, options?: DiscussionQueryOptions, session?: ClientSession) => Promise<IDiscussion[]>;
export declare const findUnansweredDiscussions: (courseId?: string, limit?: number, session?: ClientSession) => Promise<IDiscussion[]>;
export declare const countDiscussionsByLecture: (lectureId: string, session?: ClientSession) => Promise<number>;
export declare const countDiscussionsByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const countDiscussionsByUser: (userId: string, session?: ClientSession) => Promise<number>;
export declare const createDiscussion: (data: Partial<IDiscussion>, session?: ClientSession) => Promise<IDiscussion>;
export declare const updateDiscussionById: (discussionId: string, updateData: Partial<IDiscussion>, session?: ClientSession) => Promise<IDiscussion | null>;
export declare const addAnswerToDiscussion: (discussionId: string, answer: any, session?: ClientSession) => Promise<IDiscussion | null>;
export declare const deleteDiscussionById: (discussionId: string, session?: ClientSession) => Promise<IDiscussion | null>;
export declare const deleteDiscussionByUserAndId: (discussionId: string, userId: string, session?: ClientSession) => Promise<IDiscussion | null>;
export declare const bulkDeleteDiscussionsByLecture: (lectureId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteDiscussionsByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteDiscussionsByUser: (userId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateDiscussionStats: (courseId?: string) => Promise<any>;
//# sourceMappingURL=discussion.repository.d.ts.map