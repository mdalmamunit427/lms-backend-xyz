// src/modules/discussions/discussion.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Discussion, { IDiscussion } from './discussion.model';

// --- Types ---
export type DiscussionQueryOptions = {
  page?: number;
  limit?: number;
  userId?: string;
  lectureId?: string;
  courseId?: string;
  hasAnswers?: boolean;
};

// --- READ Operations ---

export const findDiscussionById = (
  discussionId: string, 
  session?: ClientSession
): Promise<IDiscussion | null> => {
  return Discussion.findById(discussionId)
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar')
    .session(session || null);
};

export const findDiscussionsByLecture = (
  lectureId: string, 
  options: DiscussionQueryOptions = {},
  session?: ClientSession
): Promise<IDiscussion[]> => {
  const { page = 1, limit = 20, hasAnswers } = options;
  const skip = (page - 1) * limit;
  
  const query: any = { lecture: lectureId };
  if (hasAnswers !== undefined) {
    query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
  }

  return Discussion.find(query)
    .populate('user', 'name avatar')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findDiscussionsByCourse = (
  courseId: string, 
  options: DiscussionQueryOptions = {},
  session?: ClientSession
): Promise<IDiscussion[]> => {
  const { page = 1, limit = 50, hasAnswers } = options;
  const skip = (page - 1) * limit;
  
  const query: any = { course: courseId };
  if (hasAnswers !== undefined) {
    query['answers.0'] = hasAnswers ? { $exists: true } : { $exists: false };
  }

  return Discussion.find(query)
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findDiscussionsByUser = (
  userId: string, 
  options: DiscussionQueryOptions = {},
  session?: ClientSession
): Promise<IDiscussion[]> => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return Discussion.find({ user: userId })
    .populate('lecture', 'title order')
    .populate('course', 'title thumbnail')
    .populate('answers.user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findUnansweredDiscussions = (
  courseId?: string,
  limit: number = 20,
  session?: ClientSession
): Promise<IDiscussion[]> => {
  const query: any = { 'answers.0': { $exists: false } };
  if (courseId) query.course = courseId;

  return Discussion.find(query)
    .populate('user', 'name avatar')
    .populate('lecture', 'title order')
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .limit(limit)
    .session(session || null);
};

export const countDiscussionsByLecture = (
  lectureId: string, 
  session?: ClientSession
): Promise<number> => {
  return Discussion.countDocuments({ lecture: lectureId }).session(session || null);
};

export const countDiscussionsByCourse = (
  courseId: string, 
  session?: ClientSession
): Promise<number> => {
  return Discussion.countDocuments({ course: courseId }).session(session || null);
};

export const countDiscussionsByUser = (
  userId: string, 
  session?: ClientSession
): Promise<number> => {
  return Discussion.countDocuments({ user: userId }).session(session || null);
};

// --- WRITE Operations ---

export const createDiscussion = (
  data: Partial<IDiscussion>, 
  session?: ClientSession
): Promise<IDiscussion> => {
  return Discussion.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create discussion document.");
    }
    return res[0]!;
  });
};

export const updateDiscussionById = (
  discussionId: string, 
  updateData: Partial<IDiscussion>, 
  session?: ClientSession
): Promise<IDiscussion | null> => {
  return Discussion.findByIdAndUpdate(discussionId, updateData, { 
    new: true, 
    runValidators: true 
  }).populate('user', 'name avatar').session(session || null);
};

export const addAnswerToDiscussion = (
  discussionId: string,
  answer: any,
  session?: ClientSession
): Promise<IDiscussion | null> => {
  return Discussion.findByIdAndUpdate(
    discussionId,
    { $push: { answers: answer } },
    { new: true, runValidators: true }
  ).populate([
    { path: 'user', select: 'name avatar' },
    { path: 'answers.user', select: 'name avatar' }
  ]).session(session || null);
};

export const deleteDiscussionById = (
  discussionId: string, 
  session?: ClientSession
): Promise<IDiscussion | null> => {
  return Discussion.findByIdAndDelete(discussionId).session(session || null);
};

export const deleteDiscussionByUserAndId = (
  discussionId: string,
  userId: string,
  session?: ClientSession
): Promise<IDiscussion | null> => {
  return Discussion.findOneAndDelete({ 
    _id: discussionId, 
    user: userId 
  }).session(session || null);
};

// --- BULK Operations ---

export const bulkDeleteDiscussionsByLecture = async (
  lectureId: string, 
  session?: ClientSession
): Promise<void> => {
  await Discussion.deleteMany({ lecture: lectureId }).session(session || null);
};

export const bulkDeleteDiscussionsByCourse = async (
  courseId: string, 
  session?: ClientSession
): Promise<void> => {
  await Discussion.deleteMany({ course: courseId }).session(session || null);
};

export const bulkDeleteDiscussionsByUser = async (
  userId: string, 
  session?: ClientSession
): Promise<void> => {
  await Discussion.deleteMany({ user: userId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateDiscussionStats = async (courseId?: string): Promise<any> => {
  const pipeline: any[] = [];
  
  if (courseId) {
    pipeline.push({ $match: { course: new Types.ObjectId(courseId) } });
  }
  
  return Discussion.aggregate([
    ...pipeline,
    {
      $group: {
        _id: courseId ? "$course" : null,
        totalDiscussions: { $sum: 1 },
        totalAnswers: { $sum: { $size: "$answers" } },
        unanswered: { 
          $sum: { $cond: [{ $eq: [{ $size: "$answers" }, 0] }, 1, 0] } 
        },
        answered: { 
          $sum: { $cond: [{ $gt: [{ $size: "$answers" }, 0] }, 1, 0] } 
        }
      }
    },
    {
      $addFields: {
        answerRate: { 
          $round: [{ 
            $multiply: [{ 
              $divide: ["$answered", "$totalDiscussions"] 
            }, 100] 
          }, 2] 
        },
        averageAnswersPerDiscussion: { 
          $round: [{ 
            $divide: ["$totalAnswers", "$totalDiscussions"] 
          }, 2] 
        }
      }
    }
  ]);
};
