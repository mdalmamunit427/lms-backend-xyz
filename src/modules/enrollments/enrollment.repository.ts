// src/modules/enrollments/enrollment.repository.ts

import mongoose, { Types, ClientSession } from 'mongoose';
import Enrollment, { IEnrollment } from './enrollment.model';

// --- Types ---
export type EnrollmentQueryOptions = {
  page?: number;
  limit?: number;
  studentId?: string;
  courseId?: string;
  instructorId?: string;
};

// --- READ Operations ---

export const findEnrollmentById = (enrollmentId: string, session?: ClientSession): Promise<IEnrollment | null> => {
  return Enrollment.findById(enrollmentId).session(session || null);
};

export const findEnrollmentByStudentAndCourse = (
  studentId: string, 
  courseId: string, 
  session?: ClientSession
): Promise<IEnrollment | null> => {
  return Enrollment.findOne({ student: studentId, course: courseId }).session(session || null);
};

export const findEnrollmentsByStudent = (studentId: string, session?: ClientSession): Promise<IEnrollment[]> => {
  return Enrollment.find({ student: studentId })
    .populate('course', 'title thumbnail category level averageRating price instructor')
    .sort({ enrolledAt: -1 })
    .session(session || null);
};

export const findEnrollmentsByCourse = (courseId: string, session?: ClientSession): Promise<IEnrollment[]> => {
  return Enrollment.find({ course: courseId })
    .populate('student', 'name email avatar')
    .sort({ enrolledAt: -1 })
    .session(session || null);
};

export const findEnrollmentsByInstructor = (instructorId: string, session?: ClientSession): Promise<IEnrollment[]> => {
  return Enrollment.find({})
    .populate({
      path: 'course',
      match: { instructor: instructorId },
      select: 'title thumbnail category level averageRating price'
    })
    .populate('student', 'name email avatar')
    .sort({ enrolledAt: -1 })
    .session(session || null);
};

export const countEnrollmentsByStudent = (studentId: string, session?: ClientSession): Promise<number> => {
  return Enrollment.countDocuments({ student: studentId }).session(session || null);
};

export const countEnrollmentsByCourse = (courseId: string, session?: ClientSession): Promise<number> => {
  return Enrollment.countDocuments({ course: courseId }).session(session || null);
};

// --- WRITE Operations ---

export const createEnrollment = (data: Partial<IEnrollment>, session?: ClientSession): Promise<IEnrollment> => {
  return Enrollment.create([data], { session: session || undefined, ordered: true }).then(res => {
    if (res.length === 0) {
      throw new Error("Repository failed to create enrollment document.");
    }
    return res[0]!;
  });
};

export const updateEnrollmentById = (
  enrollmentId: string, 
  updateData: Partial<IEnrollment>, 
  session?: ClientSession
): Promise<IEnrollment | null> => {
  return Enrollment.findByIdAndUpdate(enrollmentId, updateData, { 
    new: true, 
    runValidators: true 
  }).session(session || null);
};

export const deleteEnrollmentById = (enrollmentId: string, session?: ClientSession): Promise<IEnrollment | null> => {
  return Enrollment.findByIdAndDelete(enrollmentId).session(session || null);
};

export const deleteEnrollmentByStudentAndCourse = (
  studentId: string,
  courseId: string,
  session?: ClientSession
): Promise<IEnrollment | null> => {
  return Enrollment.findOneAndDelete({ student: studentId, course: courseId }).session(session || null);
};

// --- BULK Operations ---

export const bulkDeleteEnrollmentsByCourse = async (courseId: string, session?: ClientSession): Promise<void> => {
  await Enrollment.deleteMany({ course: courseId }).session(session || null);
};

export const bulkDeleteEnrollmentsByStudent = async (studentId: string, session?: ClientSession): Promise<void> => {
  await Enrollment.deleteMany({ student: studentId }).session(session || null);
};

// --- AGGREGATION Operations ---

export const aggregateEnrollmentStats = async (): Promise<any> => {
  return Enrollment.aggregate([
    {
      $group: {
        _id: null,
        totalEnrollments: { $sum: 1 },
        totalRevenue: { $sum: "$amountPaid" },
        averageAmount: { $avg: "$amountPaid" }
      }
    }
  ]);
};

export const aggregateEnrollmentsByPeriod = async (period: 'day' | 'week' | 'month' = 'month'): Promise<any> => {
  const groupBy = {
    day: { $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" } },
    week: { $dateToString: { format: "%Y-W%V", date: "$enrolledAt" } },
    month: { $dateToString: { format: "%Y-%m", date: "$enrolledAt" } }
  };

  return Enrollment.aggregate([
    {
      $group: {
        _id: groupBy[period],
        enrollments: { $sum: 1 },
        revenue: { $sum: "$amountPaid" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};
