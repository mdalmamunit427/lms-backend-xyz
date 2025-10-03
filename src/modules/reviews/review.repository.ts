// src/modules/reviews/review.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Review, { IReview } from './review.model';

// --- Types ---
export type ReviewQueryOptions = {
  page?: number;
  limit?: number;
  userId?: string;
  courseId?: string;
  rating?: number;
  sortBy?: 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

// --- READ Operations ---

export const findReviewById = (reviewId: string, session?: ClientSession): Promise<IReview | null> => {
  return Review.findById(reviewId)
    .populate('user', 'name avatar')
    .populate('course', 'title thumbnail')
    .session(session || null);
};

export const findReviewByUserAndCourse = (
  userId: string, 
  courseId: string, 
  session?: ClientSession
): Promise<IReview | null> => {
  return Review.findOne({ user: userId, course: courseId })
    .populate('user', 'name avatar')
    .session(session || null);
};

export const findReviewsByCourse = (
  courseId: string, 
  options: ReviewQueryOptions = {},
  session?: ClientSession
): Promise<IReview[]> => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;
  
  const sortObj: any = {};
  sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

  return Review.find({ course: courseId })
    .populate('user', 'name avatar')
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findReviewsByUser = (
  userId: string, 
  options: ReviewQueryOptions = {},
  session?: ClientSession
): Promise<IReview[]> => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return Review.find({ user: userId })
    .populate('course', 'title thumbnail instructor')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findReviewsByRating = (
  courseId: string, 
  rating: number, 
  session?: ClientSession
): Promise<IReview[]> => {
  return Review.find({ course: courseId, rating })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .session(session || null);
};

export const countReviewsByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return Review.countDocuments({ course: courseId }).session(session || null);
};

export const countReviewsByUser = (userId: string, session?: ClientSession): Promise<number> => {
  return Review.countDocuments({ user: userId }).session(session || null);
};

// --- WRITE Operations ---

export const createReview = (data: Partial<IReview>, session?: ClientSession): Promise<IReview> => {
  return Review.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create review document.");
    }
    return res[0]!;
  });
};

export const updateReviewById = (
  reviewId: string, 
  updateData: Partial<IReview>, 
  session?: ClientSession
): Promise<IReview | null> => {
  return Review.findByIdAndUpdate(reviewId, updateData, { 
    new: true, 
    runValidators: true 
  }).populate('user', 'name avatar').session(session || null);
};

export const deleteReviewById = (reviewId: string, session?: ClientSession): Promise<IReview | null> => {
  return Review.findByIdAndDelete(reviewId).session(session || null);
};

export const deleteReviewByUserAndCourse = (
  userId: string,
  courseId: string,
  session?: ClientSession
): Promise<IReview | null> => {
  return Review.findOneAndDelete({ user: userId, course: courseId }).session(session || null);
};

// --- BULK Operations ---

export const bulkDeleteReviewsByCourse = async (courseId: string, session?: ClientSession): Promise<void> => {
  await Review.deleteMany({ course: courseId }).session(session || null);
};

export const bulkDeleteReviewsByUser = async (userId: string, session?: ClientSession): Promise<void> => {
  await Review.deleteMany({ user: userId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateCourseReviewStats = async (courseId: string): Promise<any> => {
  return Review.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        ratings: { $push: "$rating" }
      }
    },
    {
      $addFields: {
        ratingDistribution: {
          "1": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 1] } } } },
          "2": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 2] } } } },
          "3": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 3] } } } },
          "4": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 4] } } } },
          "5": { $size: { $filter: { input: "$ratings", cond: { $eq: ["$$this", 5] } } } }
        }
      }
    },
    {
      $project: {
        totalReviews: 1,
        averageRating: { $round: ["$averageRating", 1] },
        ratingDistribution: 1
      }
    }
  ]);
};

export const aggregateInstructorReviewStats = async (instructorId: string): Promise<any> => {
  return Review.aggregate([
    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "courseData"
      }
    },
    { $unwind: "$courseData" },
    { $match: { "courseData.instructor": new Types.ObjectId(instructorId) } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        totalCourses: { $addToSet: "$course" }
      }
    },
    {
      $addFields: {
        totalCourses: { $size: "$totalCourses" }
      }
    }
  ]);
};

export const aggregateRecentReviews = async (limit: number = 10): Promise<any> => {
  return Review.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userData",
        pipeline: [{ $project: { name: 1, avatar: 1 } }]
      }
    },
    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "courseData",
        pipeline: [{ $project: { title: 1, thumbnail: 1 } }]
      }
    },
    { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$courseData", preserveNullAndEmptyArrays: true } }
  ]);
};
