// src/modules/lectures/lecture.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Lecture, { ILecture } from './lecture.model';

// --- Types ---
export type LectureQueryOptions = {
  page?: number;
  limit?: number;
  chapterId?: string;
  courseId?: string;
};

// --- READ Operations ---

export const findLectureById = (lectureId: string, session?: ClientSession): Promise<ILecture | null> => {
  return Lecture.findById(lectureId).session(session || null);
};

export const findLecturesByChapter = (chapterId: string, session?: ClientSession): Promise<ILecture[]> => {
  return Lecture.find({ chapter: chapterId }).sort({ order: 1 }).session(session || null);
};

export const findLecturesByCourse = (courseId: string, session?: ClientSession): Promise<ILecture[]> => {
  return Lecture.find({ course: courseId }).sort({ order: 1 }).session(session || null);
};

export const countLecturesByChapter = (chapterId: string, session?: ClientSession): Promise<number> => {
  return Lecture.countDocuments({ chapter: chapterId }).session(session || null);
};

export const countLecturesByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return Lecture.countDocuments({ course: courseId }).session(session || null);
};

// --- WRITE Operations ---

export const createLecture = (data: Partial<ILecture>, session?: ClientSession): Promise<ILecture> => {
  return Lecture.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create lecture document.");
    }
    return res[0]!;
  });
};

export const updateLectureById = (
  lectureId: string, 
  updateData: Partial<ILecture>, 
  session?: ClientSession
): Promise<ILecture | null> => {
  return Lecture.findByIdAndUpdate(lectureId, updateData, { 
    new: true, 
    runValidators: true 
  }).session(session || null);
};

export const deleteLectureById = (lectureId: string, session?: ClientSession): Promise<ILecture | null> => {
  return Lecture.findByIdAndDelete(lectureId).session(session || null);
};

// --- BULK Operations ---

export const bulkUpdateLectures = async (
  operations: Array<{ lectureId: string; order: number }>, 
  session?: ClientSession
): Promise<void> => {
  const bulkOps = operations.map((op) => ({
    updateOne: { 
      filter: { _id: op.lectureId }, 
      update: { $set: { order: op.order } } 
    },
  }));
  
  if (bulkOps.length > 0) {
    await Lecture.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
  }
};

export const bulkDeleteLecturesByChapter = async (chapterId: string, session?: ClientSession): Promise<void> => {
  await Lecture.deleteMany({ chapter: chapterId }).session(session || null);
};

export const bulkDeleteLecturesByCourse = async (courseId: string, session?: ClientSession): Promise<void> => {
  await Lecture.deleteMany({ course: courseId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateLectureStats = async (courseId: string): Promise<any> => {
  return Lecture.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        totalLectures: { $sum: 1 },
        totalDuration: { $sum: "$duration" },
        previewCount: { 
          $sum: { $cond: [{ $eq: ["$isPreview", true] }, 1, 0] } 
        }
      }
    }
  ]);
};
