"use strict";
// src/modules/enrollments/enrollment.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateEnrollmentsByPeriod = exports.aggregateEnrollmentStats = exports.bulkDeleteEnrollmentsByStudent = exports.bulkDeleteEnrollmentsByCourse = exports.deleteEnrollmentByStudentAndCourse = exports.deleteEnrollmentById = exports.updateEnrollmentById = exports.createEnrollment = exports.countEnrollmentsByCourse = exports.countEnrollmentsByStudent = exports.findEnrollmentsByInstructor = exports.findEnrollmentsByCourse = exports.findEnrollmentsByStudent = exports.findEnrollmentByStudentAndCourse = exports.findEnrollmentById = void 0;
const enrollment_model_1 = __importDefault(require("./enrollment.model"));
// --- READ Operations ---
const findEnrollmentById = (enrollmentId, session) => {
    return enrollment_model_1.default.findById(enrollmentId).session(session || null);
};
exports.findEnrollmentById = findEnrollmentById;
const findEnrollmentByStudentAndCourse = (studentId, courseId, session) => {
    return enrollment_model_1.default.findOne({ student: studentId, course: courseId }).session(session || null);
};
exports.findEnrollmentByStudentAndCourse = findEnrollmentByStudentAndCourse;
const findEnrollmentsByStudent = (studentId, session) => {
    return enrollment_model_1.default.find({ student: studentId })
        .populate('course', 'title thumbnail category level averageRating price instructor')
        .sort({ enrolledAt: -1 })
        .session(session || null);
};
exports.findEnrollmentsByStudent = findEnrollmentsByStudent;
const findEnrollmentsByCourse = (courseId, session) => {
    return enrollment_model_1.default.find({ course: courseId })
        .populate('student', 'name email avatar')
        .sort({ enrolledAt: -1 })
        .session(session || null);
};
exports.findEnrollmentsByCourse = findEnrollmentsByCourse;
const findEnrollmentsByInstructor = (instructorId, session) => {
    return enrollment_model_1.default.find({})
        .populate({
        path: 'course',
        match: { instructor: instructorId },
        select: 'title thumbnail category level averageRating price'
    })
        .populate('student', 'name email avatar')
        .sort({ enrolledAt: -1 })
        .session(session || null);
};
exports.findEnrollmentsByInstructor = findEnrollmentsByInstructor;
const countEnrollmentsByStudent = (studentId, session) => {
    return enrollment_model_1.default.countDocuments({ student: studentId }).session(session || null);
};
exports.countEnrollmentsByStudent = countEnrollmentsByStudent;
const countEnrollmentsByCourse = (courseId, session) => {
    return enrollment_model_1.default.countDocuments({ course: courseId }).session(session || null);
};
exports.countEnrollmentsByCourse = countEnrollmentsByCourse;
// --- WRITE Operations ---
const createEnrollment = (data, session) => {
    return enrollment_model_1.default.create([data], { session: session || undefined, ordered: true }).then(res => {
        if (res.length === 0) {
            throw new Error("Repository failed to create enrollment document.");
        }
        return res[0];
    });
};
exports.createEnrollment = createEnrollment;
const updateEnrollmentById = (enrollmentId, updateData, session) => {
    return enrollment_model_1.default.findByIdAndUpdate(enrollmentId, updateData, {
        new: true,
        runValidators: true
    }).session(session || null);
};
exports.updateEnrollmentById = updateEnrollmentById;
const deleteEnrollmentById = (enrollmentId, session) => {
    return enrollment_model_1.default.findByIdAndDelete(enrollmentId).session(session || null);
};
exports.deleteEnrollmentById = deleteEnrollmentById;
const deleteEnrollmentByStudentAndCourse = (studentId, courseId, session) => {
    return enrollment_model_1.default.findOneAndDelete({ student: studentId, course: courseId }).session(session || null);
};
exports.deleteEnrollmentByStudentAndCourse = deleteEnrollmentByStudentAndCourse;
// --- BULK Operations ---
const bulkDeleteEnrollmentsByCourse = async (courseId, session) => {
    await enrollment_model_1.default.deleteMany({ course: courseId }).session(session || null);
};
exports.bulkDeleteEnrollmentsByCourse = bulkDeleteEnrollmentsByCourse;
const bulkDeleteEnrollmentsByStudent = async (studentId, session) => {
    await enrollment_model_1.default.deleteMany({ student: studentId }).session(session || null);
};
exports.bulkDeleteEnrollmentsByStudent = bulkDeleteEnrollmentsByStudent;
// --- AGGREGATION Operations ---
const aggregateEnrollmentStats = async () => {
    return enrollment_model_1.default.aggregate([
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
exports.aggregateEnrollmentStats = aggregateEnrollmentStats;
const aggregateEnrollmentsByPeriod = async (period = 'month') => {
    const groupBy = {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" } },
        week: { $dateToString: { format: "%Y-W%V", date: "$enrolledAt" } },
        month: { $dateToString: { format: "%Y-%m", date: "$enrolledAt" } }
    };
    return enrollment_model_1.default.aggregate([
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
exports.aggregateEnrollmentsByPeriod = aggregateEnrollmentsByPeriod;
//# sourceMappingURL=enrollment.repository.js.map