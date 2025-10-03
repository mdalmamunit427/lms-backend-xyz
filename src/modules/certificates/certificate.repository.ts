// src/modules/certificates/certificate.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Certificate, { ICertificate } from './certificate.model';

// --- Types ---
export type CertificateQueryOptions = {
  page?: number;
  limit?: number;
  userId?: string;
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
};

// --- READ Operations ---

export const findCertificateById = (
  certificateId: string, 
  session?: ClientSession
): Promise<ICertificate | null> => {
  return Certificate.findOne({ certificateId })
    .populate('course', 'title instructor')
    .populate('user', 'name email')
    .session(session || null);
};

export const findCertificateByUserAndCourse = (
  userId: string, 
  courseId: string, 
  session?: ClientSession
): Promise<ICertificate | null> => {
  return Certificate.findOne({ user: userId, course: courseId })
    .populate('course', 'title instructor')
    .populate('user', 'name email')
    .session(session || null);
};

export const findCertificatesByUser = (
  userId: string, 
  options: CertificateQueryOptions = {},
  session?: ClientSession
): Promise<ICertificate[]> => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  return Certificate.find({ user: userId })
    .populate('course', 'title thumbnail instructor')
    .sort({ issueDate: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findCertificatesByCourse = (
  courseId: string, 
  options: CertificateQueryOptions = {},
  session?: ClientSession
): Promise<ICertificate[]> => {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  return Certificate.find({ course: courseId })
    .populate('user', 'name email')
    .sort({ issueDate: -1 })
    .skip(skip)
    .limit(limit)
    .session(session || null);
};

export const findRecentCertificates = (
  limit: number = 20,
  session?: ClientSession
): Promise<ICertificate[]> => {
  return Certificate.find({})
    .populate('course', 'title')
    .populate('user', 'name email')
    .sort({ issueDate: -1 })
    .limit(limit)
    .session(session || null);
};

export const countCertificatesByUser = (
  userId: string, 
  session?: ClientSession
): Promise<number> => {
  return Certificate.countDocuments({ user: userId }).session(session || null);
};

export const countCertificatesByCourse = (
  courseId: string, 
  session?: ClientSession
): Promise<number> => {
  return Certificate.countDocuments({ course: courseId }).session(session || null);
};

// --- WRITE Operations ---

export const createCertificate = (
  data: Partial<ICertificate>, 
  session?: ClientSession
): Promise<ICertificate> => {
  return Certificate.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create certificate document.");
    }
    return res[0]!;
  });
};

export const updateCertificateById = (
  certificateId: string, 
  updateData: Partial<ICertificate>, 
  session?: ClientSession
): Promise<ICertificate | null> => {
  return Certificate.findOneAndUpdate(
    { certificateId }, 
    updateData, 
    { new: true, runValidators: true }
  ).session(session || null);
};

export const deleteCertificateById = (
  certificateId: string, 
  session?: ClientSession
): Promise<ICertificate | null> => {
  return Certificate.findOneAndDelete({ certificateId }).session(session || null);
};

export const deleteCertificateByUserAndCourse = (
  userId: string,
  courseId: string,
  session?: ClientSession
): Promise<ICertificate | null> => {
  return Certificate.findOneAndDelete({ 
    user: userId, 
    course: courseId 
  }).session(session || null);
};

// --- BULK Operations ---

export const bulkDeleteCertificatesByCourse = async (
  courseId: string, 
  session?: ClientSession
): Promise<void> => {
  await Certificate.deleteMany({ course: courseId }).session(session || null);
};

export const bulkDeleteCertificatesByUser = async (
  userId: string, 
  session?: ClientSession
): Promise<void> => {
  await Certificate.deleteMany({ user: userId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateCertificateStats = async (
  options: CertificateQueryOptions = {}
): Promise<any> => {
  const { startDate, endDate, courseId } = options;
  
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.issueDate = {};
    if (startDate) matchStage.issueDate.$gte = startDate;
    if (endDate) matchStage.issueDate.$lte = endDate;
  }
  if (courseId) matchStage.course = new Types.ObjectId(courseId);

  const pipeline: any[] = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  return Certificate.aggregate([
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCertificates: { $sum: 1 },
        uniqueUsers: { $addToSet: "$user" },
        uniqueCourses: { $addToSet: "$course" }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: "$uniqueUsers" },
        uniqueCourseCount: { $size: "$uniqueCourses" }
      }
    }
  ]);
};

export const aggregateCertificatesByPeriod = async (
  period: 'day' | 'week' | 'month' = 'month'
): Promise<any> => {
  const groupBy = {
    day: { $dateToString: { format: "%Y-%m-%d", date: "$issueDate" } },
    week: { $dateToString: { format: "%Y-W%V", date: "$issueDate" } },
    month: { $dateToString: { format: "%Y-%m", date: "$issueDate" } }
  };

  return Certificate.aggregate([
    {
      $group: {
        _id: groupBy[period],
        certificatesIssued: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};
