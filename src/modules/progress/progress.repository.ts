// src/modules/progress/progress.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import CourseProgress, { ICourseProgress } from './progress.model';
import Course from '../courses/course.model';

// --- Types ---
export type ProgressQueryOptions = {
  page?: number;
  limit?: number;
  userId?: string;
  courseId?: string;
};

// --- READ Operations ---

export const findProgressById = (progressId: string, session?: ClientSession): Promise<ICourseProgress | null> => {
  return CourseProgress.findById(progressId).session(session || null);
};

export const findProgressByUserAndCourse = (
  userId: string, 
  courseId: string, 
  session?: ClientSession
): Promise<ICourseProgress | null> => {
  return CourseProgress.findOne({ user: userId, course: courseId }).session(session || null);
};

export const findProgressByUser = (userId: string, session?: ClientSession): Promise<ICourseProgress[]> => {
  return CourseProgress.find({ user: userId })
    .populate('course', 'title thumbnail category level averageRating')
    .sort({ updatedAt: -1 })
    .session(session || null);
};

export async function findCourseProgress(userId: string, courseId: string) {
  const progress = await CourseProgress.findOne({
    user: userId,
    course: courseId,
  }).lean();

  // If no progress exists yet, create default response
  if (!progress) {
    const course = await Course.findById(courseId)
      .select("title thumbnail")
      .lean();
    return {
      course,
      completedLectures: {},
      totalLecturesCompleted: 0,
      quizzesCompleted: false,
      averageQuizScore: 0,
      isCourseCompleted: false,
      lastViewedLecture: null,
      completionPercentage: 0,
      totalLectures: 0,
      remainingLectures: 0,
    };
  }

  return progress;
}


export const countCompletedCoursesByUser = (userId: string, session?: ClientSession): Promise<number> => {
  return CourseProgress.countDocuments({ 
    user: userId, 
    isCourseCompleted: true 
  }).session(session || null);
};

export const countProgressByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return CourseProgress.countDocuments({ course: courseId }).session(session || null);
};

export const countCompletedByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return CourseProgress.countDocuments({ 
    course: courseId, 
    isCourseCompleted: true 
  }).session(session || null);
};

// --- WRITE Operations ---

export const createProgress = (data: Partial<ICourseProgress>, session?: ClientSession): Promise<ICourseProgress> => {
  return CourseProgress.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create progress document.");
    }
    return res[0]!;
  });
};

export const updateProgressById = (
  progressId: string, 
  updateData: Partial<ICourseProgress>, 
  session?: ClientSession
): Promise<ICourseProgress | null> => {
  return CourseProgress.findByIdAndUpdate(progressId, updateData, { 
    new: true, 
    runValidators: true 
  }).session(session || null);
};

export const updateProgressByUserAndCourse = (
  userId: string,
  courseId: string,
  updateData: Partial<ICourseProgress>, 
  session?: ClientSession
): Promise<ICourseProgress | null> => {
  return CourseProgress.findOneAndUpdate(
    { user: userId, course: courseId },
    updateData,
    { new: true, runValidators: true, upsert: true }
  ).session(session || null);
};

export const deleteProgressById = (progressId: string, session?: ClientSession): Promise<ICourseProgress | null> => {
  return CourseProgress.findByIdAndDelete(progressId).session(session || null);
};

export const deleteProgressByUserAndCourse = (
  userId: string,
  courseId: string,
  session?: ClientSession
): Promise<ICourseProgress | null> => {
  return CourseProgress.findOneAndDelete({ user: userId, course: courseId }).session(session || null);
};

// --- BULK Operations ---

export const bulkDeleteProgressByCourse = async (courseId: string, session?: ClientSession): Promise<void> => {
  await CourseProgress.deleteMany({ course: courseId }).session(session || null);
};

export const bulkDeleteProgressByUser = async (userId: string, session?: ClientSession): Promise<void> => {
  await CourseProgress.deleteMany({ user: userId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateUserStats = async (userId: string): Promise<any> => {
  return CourseProgress.aggregate([
    { $match: { user: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$user",
        totalCourses: { $sum: 1 },
        completedCourses: { 
          $sum: { $cond: [{ $eq: ["$isCourseCompleted", true] }, 1, 0] } 
        },
        totalLecturesCompleted: { $sum: "$totalLecturesCompleted" },
        averageQuizScore: { $avg: "$averageQuizScore" }
      }
    }
  ]);
};

export const aggregateCourseStats = async (courseId: string): Promise<any> => {
  return CourseProgress.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        totalStudents: { $sum: 1 },
        completedStudents: { 
          $sum: { $cond: [{ $eq: ["$isCourseCompleted", true] }, 1, 0] } 
        },
        averageProgress: { 
          $avg: { 
            $divide: ["$totalLecturesCompleted", { $ifNull: ["$totalLectures", 1] }] 
          } 
        },
        averageQuizScore: { $avg: "$averageQuizScore" }
      }
    }
  ]);
};
