// src/modules/chapters/chapter.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Chapter, { IChapter } from './chapter.model';
import Lecture from '../lectures/lecture.model';

// --- Types ---
export type ChapterQueryOptions = {
  page?: number;
  limit?: number;
  courseId?: string;
};

// --- READ Operations ---

export const findChapterById = (chapterId: string, session?: ClientSession): Promise<IChapter | null> => {
  return Chapter.findById(chapterId).session(session || null);
};

export const findChaptersByCourse = (courseId: string, session?: ClientSession): Promise<IChapter[]> => {
  return Chapter.find({ course: courseId }).sort({ order: 1 }).session(session || null);
};

export const countChaptersByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return Chapter.countDocuments({ course: courseId }).session(session || null);
};

// --- WRITE Operations ---

export const createChapter = (data: Partial<IChapter>, session?: ClientSession): Promise<IChapter> => {
  return Chapter.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create chapter document.");
    }
    return res[0]!;
  });
};

export const updateChapterById = (
  chapterId: string, 
  updateData: Partial<IChapter>, 
  session?: ClientSession
): Promise<IChapter | null> => {
  return Chapter.findByIdAndUpdate(chapterId, updateData, { 
    new: true, 
    runValidators: true 
  }).session(session || null);
};

export const deleteChapterById = (chapterId: string, session?: ClientSession): Promise<IChapter | null> => {
  return Chapter.findByIdAndDelete(chapterId).session(session || null);
};

// --- BULK Operations ---

export const bulkUpdateChapters = async (
  operations: Array<{ chapterId: string; order: number }>, 
  session?: ClientSession
): Promise<void> => {
  const bulkOps = operations.map((op) => ({
    updateOne: { 
      filter: { _id: op.chapterId }, 
      update: { $set: { order: op.order } } 
    },
  }));
  
  if (bulkOps.length > 0) {
    await Chapter.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
  }
};

// --- CASCADING Operations ---

export const deleteChapterDependencies = async (chapterId: string, session: ClientSession): Promise<void> => {
  // Delete all lectures associated with this chapter
  await Lecture.deleteMany({ chapter: chapterId }).session(session);
};
