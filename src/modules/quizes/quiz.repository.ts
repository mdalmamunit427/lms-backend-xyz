// src/modules/quizes/quiz.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Quiz, { IQuiz } from './quiz.model';

// --- Types ---
export type QuizQueryOptions = {
  page?: number;
  limit?: number;
  chapterId?: string;
  courseId?: string;
};

// --- READ Operations ---

export const findQuizById = (quizId: string, session?: ClientSession): Promise<IQuiz | null> => {
  return Quiz.findById(quizId).session(session || null);
};

export const findQuizzesByChapter = (chapterId: string, session?: ClientSession): Promise<IQuiz[]> => {
  return Quiz.find({ chapter: chapterId }).sort({ order: 1 }).session(session || null);
};

export const findQuizzesByCourse = (courseId: string, session?: ClientSession): Promise<IQuiz[]> => {
  return Quiz.find({ course: courseId })
    .populate('chapter', 'title order')
    .sort({ order: 1 })
    .session(session || null);
};

export const countQuizzesByChapter = (chapterId: string, session?: ClientSession): Promise<number> => {
  return Quiz.countDocuments({ chapter: chapterId }).session(session || null);
};

export const countQuizzesByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return Quiz.countDocuments({ course: courseId }).session(session || null);
};

// --- WRITE Operations ---

export const createQuiz = (data: Partial<IQuiz>, session?: ClientSession): Promise<IQuiz> => {
  return Quiz.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create quiz document.");
    }
    return res[0]!;
  });
};

export const updateQuizById = (
  quizId: string, 
  updateData: Partial<IQuiz>, 
  session?: ClientSession
): Promise<IQuiz | null> => {
  return Quiz.findByIdAndUpdate(quizId, updateData, { 
    new: true, 
    runValidators: true 
  }).session(session || null);
};

export const deleteQuizById = (quizId: string, session?: ClientSession): Promise<IQuiz | null> => {
  return Quiz.findByIdAndDelete(quizId).session(session || null);
};

// --- BULK Operations ---

export const bulkUpdateQuizzes = async (
  operations: Array<{ quizId: string; order: number }>, 
  session?: ClientSession
): Promise<void> => {
  const bulkOps = operations.map((op) => ({
    updateOne: { 
      filter: { _id: op.quizId }, 
      update: { $set: { order: op.order } } 
    },
  }));
  
  if (bulkOps.length > 0) {
    await Quiz.bulkWrite(bulkOps, { session: session || undefined, ordered: true });
  }
};

export const bulkDeleteQuizzesByChapter = async (chapterId: string, session?: ClientSession): Promise<void> => {
  await Quiz.deleteMany({ chapter: chapterId }).session(session || null);
};

export const bulkDeleteQuizzesByCourse = async (courseId: string, session?: ClientSession): Promise<void> => {
  await Quiz.deleteMany({ course: courseId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateQuizStats = async (courseId: string): Promise<any> => {
  return Quiz.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        totalQuizzes: { $sum: 1 },
        totalQuestions: { 
          $sum: { $size: "$questions" } 
        },
        averageQuestionsPerQuiz: { 
          $avg: { $size: "$questions" } 
        }
      }
    }
  ]);
};
