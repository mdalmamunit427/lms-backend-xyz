"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnrollmentStatus = exports.getEnrolledCourseDetails = exports.getEnrolledCoursesByUser = exports.handleStripeWebhookService = exports.createStripeSessionService = exports.calculateFinalPrice = exports.processEnrollment = void 0;
const stripe_1 = __importDefault(require("stripe"));
const mongoose_1 = require("mongoose");
const withTransaction_1 = require("../../utils/withTransaction");
const enrollment_model_1 = __importDefault(require("./enrollment.model"));
const course_model_1 = __importDefault(require("../courses/course.model"));
const errorHandler_1 = require("../../utils/errorHandler");
const errorHandler_2 = require("../../utils/errorHandler");
const cache_1 = require("../../utils/cache");
const user_model_1 = __importDefault(require("../users/user.model"));
const email_1 = require("../../utils/email");
const coupon_model_1 = __importDefault(require("../coupons/coupon.model"));
const progress_model_1 = __importDefault(require("../progress/progress.model"));
const lecture_model_1 = __importDefault(require("../lectures/lecture.model"));
const quiz_model_1 = __importDefault(require("../quizes/quiz.model"));
// === ATOMIC ENROLLMENT PROCESS ===
const processEnrollment = async ({ studentId, courseId, amountPaid, paymentStatus, couponId, stripeSessionId, }) => {
    try {
        const enrollment = await (0, withTransaction_1.withTransaction)(async (session) => {
            // Final Correction: Use new Types.ObjectId() for robust query in a transaction
            const existingEnrollment = await enrollment_model_1.default.findOne({
                student: new mongoose_1.Types.ObjectId(studentId),
                course: new mongoose_1.Types.ObjectId(courseId),
            }).session(session);
            if (existingEnrollment) {
                return existingEnrollment;
            }
            await course_model_1.default.updateOne({ _id: courseId }, { $inc: { enrollmentCount: 1 } }, { session });
            const courseCheck = await course_model_1.default.findById(courseId).session(session);
            if (!courseCheck) {
                throw (0, errorHandler_2.createError)("Course not found during enrollment.", 404);
            }
            const enrollmentData = {
                student: studentId,
                course: courseId,
                amountPaid,
                paymentStatus,
                coupon: couponId,
                stripeSessionId,
            };
            const newEnrollment = await enrollment_model_1.default.create([enrollmentData], {
                session,
            });
            await (0, cache_1.invalidateCache)(`course:${courseId}`);
            await (0, cache_1.invalidateCache)("courses:list");
            const student = await user_model_1.default.findById(studentId);
            const course = await course_model_1.default.findById(courseId);
            if (student && course) {
                // Fire-and-forget email to avoid blocking the request
                (0, email_1.sendEmail)(student.email, "Enrollment Confirmed - CodeTutor LMS", "enrollment", {
                    studentName: student.name,
                    courseTitle: course.title,
                    dashboardUrl: process.env.FRONTEND_URL + "/dashboard",
                }).catch((err) => console.error("Email send failed (non-blocking):", err?.message || err));
            }
            return newEnrollment[0];
        });
        return {
            success: true,
            data: enrollment,
            message: 'Enrollment processed successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Enrollment processing failed',
            errors: [error.message]
        };
    }
};
exports.processEnrollment = processEnrollment;
// Centralized price calculation logic
const calculateFinalPrice = async (courseId, couponCode) => {
    try {
        const cacheKey = `course:${courseId}`;
        let course;
        // 1. OPTIMIZATION: Cache-First Read for Course Details
        const cachedCourse = await (0, cache_1.getCache)(cacheKey);
        if (cachedCourse) {
            course = cachedCourse;
        }
        else {
            // Fallback to database if cache miss (Explicitly constructing ObjectId for safety)
            let objectId;
            try {
                objectId = new mongoose_1.Types.ObjectId(courseId);
            }
            catch (err) {
                // This path is usually not hit due to Zod validation, but kept for defensiveness
                throw new errorHandler_1.AppError("Invalid courseId format.", 400);
            }
            const dbCourse = await course_model_1.default.findById(objectId).lean();
            if (!dbCourse) {
                throw new errorHandler_1.AppError('Course not found', 404);
            }
            course = dbCourse;
            // Cache the course details for subsequent pricing checks (TTL: 1 hour)
            await (0, cache_1.setCache)(cacheKey, course, 60 * 60);
        }
        let finalPrice = course.price;
        // 2. Apply Course's Inherent Discount
        if (course.discount && course.discount > 0) {
            finalPrice -= (finalPrice * course.discount) / 100;
        }
        let coupon = null;
        // 3. Apply Coupon Code Discount (if provided)
        if (couponCode) {
            // Fetch coupon
            coupon = await coupon_model_1.default.findOne({ code: couponCode.toUpperCase(), isActive: true });
            const now = new Date();
            if (!coupon || (coupon.expiresAt && coupon.expiresAt < now)) {
                throw new errorHandler_1.AppError('Invalid or expired coupon', 400);
            }
            // Check specific course applicability (Handles 'all' vs. ObjectId)
            const appliesToValue = coupon.appliesTo;
            let couponAppliesToId = '';
            if (appliesToValue && typeof appliesToValue === 'object' && appliesToValue instanceof mongoose_1.Types.ObjectId) {
                couponAppliesToId = appliesToValue.toString();
            }
            else if (typeof appliesToValue === 'string') {
                couponAppliesToId = appliesToValue;
            }
            if (couponAppliesToId !== 'all' && couponAppliesToId !== courseId) {
                throw new errorHandler_1.AppError('Coupon not valid for this course.', 400);
            }
            finalPrice -= (finalPrice * coupon.discountValue) / 100;
        }
        // 4. Return Final Price and Data
        return {
            success: true,
            data: {
                finalPrice: Math.round(finalPrice * 100) / 100,
                coupon,
                course,
            },
            message: 'Price calculated successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Price calculation failed',
            errors: [error.message]
        };
    }
};
exports.calculateFinalPrice = calculateFinalPrice;
const createStripeSessionService = async (courseId, studentId, finalPrice, couponId) => {
    try {
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return {
                success: false,
                message: 'Course not found',
                errors: ['No course found with the provided ID']
            };
        }
        const stripeClient = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
        const metadata = {
            courseId,
            studentId,
            couponId: couponId || null,
        };
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: course.title },
                        unit_amount: finalPrice,
                    },
                    quantity: 1,
                },
            ],
            metadata: metadata,
            success_url: `${process.env.FRONTEND_URL}/enroll/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/enroll/cancel`,
        });
        return {
            success: true,
            data: { sessionId: session.id, sessionUrl: session.url },
            message: 'Stripe session created successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Stripe session creation failed',
            errors: [error.message]
        };
    }
};
exports.createStripeSessionService = createStripeSessionService;
const handleStripeWebhookService = async (event) => {
    try {
        if (event.type !== "checkout.session.completed") {
            return {
                success: true,
                data: true,
                message: 'Webhook event type not handled'
            };
        }
        const session = event.data.object;
        const { courseId, studentId, couponId } = session.metadata || {};
        const amountPaid = (session.amount_total || 0) / 100;
        if (!courseId || !studentId) {
            console.error("⚠ Missing courseId or studentId in metadata");
            return {
                success: false,
                message: 'Missing courseId or studentId in metadata',
                errors: ['Invalid webhook metadata']
            };
        }
        const cleanCouponId = couponId === "" ? undefined : couponId;
        const enrollmentResult = await (0, exports.processEnrollment)({
            studentId,
            courseId,
            amountPaid,
            paymentStatus: "paid",
            couponId: cleanCouponId,
            stripeSessionId: session.id,
        });
        if (!enrollmentResult.success) {
            return {
                success: false,
                message: 'Enrollment processing failed',
                errors: enrollmentResult.errors
            };
        }
        if (cleanCouponId) {
            await coupon_model_1.default.findByIdAndUpdate(cleanCouponId, { $inc: { usageCount: 1 } });
            await (0, cache_1.invalidateCache)(`coupon:${cleanCouponId}`);
        }
        return {
            success: true,
            data: true,
            message: 'Webhook processed successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Webhook processing failed',
            errors: [error.message]
        };
    }
};
exports.handleStripeWebhookService = handleStripeWebhookService;
// === ENROLLED COURSES FUNCTIONALITY ===
// Get all enrolled courses for a user (lightweight list)
const getEnrolledCoursesByUser = async (userId) => {
    try {
        // Get all enrollments for the user with course details
        const enrollments = await enrollment_model_1.default.find({ student: new mongoose_1.Types.ObjectId(userId) })
            .populate({
            path: 'course',
            select: 'title instructor price thumbnail totalDuration updatedAt',
            populate: {
                path: 'instructor',
                select: 'name avatar'
            }
        })
            .lean();
        // Filter out enrollments where course is null (deleted courses)
        const validEnrollments = enrollments.filter(enrollment => enrollment.course && typeof enrollment.course === 'object');
        // Get additional course statistics
        const enrolledCourses = await Promise.all(validEnrollments.map(async (enrollment) => {
            const course = enrollment.course; // Type assertion for populated course
            const courseId = course._id.toString();
            // Get lecture count and user's progress for this course
            const [courseStats, progress] = await Promise.all([
                course_model_1.default.aggregate([
                    { $match: { _id: new mongoose_1.Types.ObjectId(courseId) } },
                    {
                        $lookup: {
                            from: "lectures",
                            localField: "_id",
                            foreignField: "course",
                            as: "lectures"
                        }
                    },
                    {
                        $lookup: {
                            from: "quizzes",
                            localField: "_id",
                            foreignField: "course",
                            as: "quizzes"
                        }
                    },
                    {
                        $project: {
                            lectureCount: { $size: "$lectures" },
                            quizCount: { $size: "$quizzes" },
                            totalItems: { $add: [{ $size: "$lectures" }, { $size: "$quizzes" }] }
                        }
                    }
                ]),
                progress_model_1.default.findOne({
                    user: new mongoose_1.Types.ObjectId(userId),
                    course: new mongoose_1.Types.ObjectId(courseId)
                })
            ]);
            const courseData = courseStats[0] || { lectureCount: 0, quizCount: 0, totalItems: 0 };
            const lectureCount = courseData.lectureCount;
            const quizCount = courseData.quizCount;
            const totalItems = courseData.totalItems;
            const completedLectures = progress?.totalLecturesCompleted || 0;
            const completedQuizzes = progress?.totalQuizzesCompleted || 0;
            const totalCompletedItems = completedLectures + completedQuizzes;
            // Calculate completion percentage based on both lectures and quizzes
            const completionPercentage = totalItems > 0
                ? Math.round((totalCompletedItems / totalItems) * 100)
                : 0;
            // Check if course is fully completed (all lectures + all quizzes)
            const isCourseFullyCompleted = (completedLectures >= lectureCount) &&
                (quizCount === 0 || progress?.quizzesCompleted === true);
            return {
                _id: course._id,
                title: course.title,
                thumbnail: course.thumbnail,
                instructor: {
                    name: course.instructor?.name || 'Unknown',
                    avatar: course.instructor?.avatar || null
                },
                price: course.price,
                totalDuration: course.totalDuration, // Use from populated course
                enrollmentDate: enrollment.enrollmentDate,
                paymentStatus: enrollment.paymentStatus,
                amountPaid: enrollment.amountPaid,
                enrollmentId: enrollment._id,
                updatedAt: course.updatedAt,
                progress: {
                    totalLectures: lectureCount,
                    completedLectures,
                    totalQuizzes: quizCount,
                    completedQuizzes,
                    totalItems,
                    completedItems: totalCompletedItems,
                    completionPercentage,
                    quizzesCompleted: progress?.quizzesCompleted || false,
                    averageQuizScore: progress?.averageQuizScore || 0,
                    isCourseCompleted: isCourseFullyCompleted
                }
            };
        }));
        // Calculate total statistics
        const totalCoursesCompleted = enrolledCourses.filter(course => course.progress.isCourseCompleted === true).length;
        const totalRewardPoints = enrolledCourses.reduce((total, course) => {
            // 10 points per completed lecture + 20 points per completed quiz + 50 bonus for full course completion
            const lecturePoints = course.progress.completedLectures * 10;
            const quizPoints = course.progress.completedQuizzes * 20;
            const completionBonus = course.progress.isCourseCompleted ? 50 : 0;
            return total + lecturePoints + quizPoints + completionBonus;
        }, 0);
        return {
            success: true,
            data: {
                enrolledCourses,
                totalCoursesCompleted,
                totalRewardPoints
            },
            message: 'Enrolled courses retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve enrolled courses',
            errors: [error.message]
        };
    }
};
exports.getEnrolledCoursesByUser = getEnrolledCoursesByUser;
// Get specific enrolled course with course content only (for course player)
const getEnrolledCourseDetails = async (courseId, userId) => {
    try {
        // Verify enrollment
        const enrollment = await enrollment_model_1.default.findOne({
            student: new mongoose_1.Types.ObjectId(userId),
            course: new mongoose_1.Types.ObjectId(courseId)
        });
        if (!enrollment) {
            throw (0, errorHandler_2.createError)('Course not found or not enrolled', 404);
        }
        // Get course content only using aggregation pipeline
        const result = await course_model_1.default.aggregate([
            { $match: { _id: new mongoose_1.Types.ObjectId(courseId) } },
            // Lookup chapters with their content
            {
                $lookup: {
                    from: "chapters",
                    localField: "_id",
                    foreignField: "course",
                    as: "chapters",
                    pipeline: [
                        { $sort: { order: 1 } },
                        // Lookup lectures for each chapter
                        {
                            $lookup: {
                                from: "lectures",
                                localField: "_id",
                                foreignField: "chapter",
                                as: "lectures",
                                pipeline: [{ $sort: { order: 1 } }]
                            }
                        },
                        // Lookup quizzes for each chapter
                        {
                            $lookup: {
                                from: "quizzes",
                                localField: "_id",
                                foreignField: "chapter",
                                as: "quizzes",
                                pipeline: [{ $sort: { order: 1 } }]
                            }
                        },
                        // Merge lectures + quizzes into a single items array
                        {
                            $addFields: {
                                items: {
                                    $concatArrays: [
                                        // Map lectures
                                        {
                                            $map: {
                                                input: "$lectures",
                                                as: "lec",
                                                in: {
                                                    type: "lecture",
                                                    lectureId: "$$lec._id",
                                                    lectureTitle: "$$lec.title",
                                                    lectureUrl: "$$lec.videoUrl",
                                                    lectureDuration: "$$lec.duration",
                                                    isPreview: "$$lec.isPreview",
                                                    resources: "$$lec.resources"
                                                }
                                            }
                                        },
                                        // Map quizzes
                                        {
                                            $map: {
                                                input: "$quizzes",
                                                as: "quiz",
                                                in: {
                                                    type: "quiz",
                                                    quizId: "$$quiz._id",
                                                    lectureTitle: "$$quiz.title",
                                                    questionCount: { $size: "$$quiz.questions" },
                                                    questions: "$$quiz.questions"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        // Remove the separate lectures and quizzes arrays
                        { $project: { lectures: 0, quizzes: 0 } }
                    ]
                }
            },
            // Project only the fields needed for course player
            {
                $project: {
                    _id: 1,
                    title: 1,
                    thumbnail: 1,
                    courseContent: {
                        $map: {
                            input: "$chapters",
                            as: "chapter",
                            in: {
                                chapterId: "$$chapter._id",
                                chapterTitle: "$$chapter.title",
                                chapterContent: "$$chapter.items"
                            }
                        }
                    }
                }
            }
        ]);
        if (!result || result.length === 0) {
            throw new errorHandler_1.AppError('Course not found', 404);
        }
        // Get course progress
        const progress = await progress_model_1.default.findOne({
            user: new mongoose_1.Types.ObjectId(userId),
            course: new mongoose_1.Types.ObjectId(courseId)
        });
        // Get all lectures and quizzes for this course to calculate progress
        const [allLectures, allQuizzes] = await Promise.all([
            lecture_model_1.default.find({ course: courseId }).select('_id').lean(),
            quiz_model_1.default.find({ course: courseId }).select('_id').lean()
        ]);
        const totalLectures = allLectures.length;
        const totalQuizzes = allQuizzes.length;
        const totalItems = totalLectures + totalQuizzes;
        const completedLectures = progress?.totalLecturesCompleted || 0;
        const completedQuizzes = progress?.totalQuizzesCompleted || 0;
        const totalCompletedItems = completedLectures + completedQuizzes;
        const completionPercentage = totalItems > 0
            ? Math.round((totalCompletedItems / totalItems) * 100)
            : 0;
        const isCourseCompleted = (completedLectures >= totalLectures) &&
            (totalQuizzes === 0 || progress?.quizzesCompleted === true);
        // Calculate reward points for this course
        const lecturePoints = completedLectures * 10;
        const quizPoints = completedQuizzes * 20;
        const completionBonus = isCourseCompleted ? 50 : 0;
        const totalRewardPoints = lecturePoints + quizPoints + completionBonus;
        // Get completed lecture IDs and quiz results
        const completedLectureIds = new Set(progress?.completedLectures ? Array.from(progress.completedLectures.keys()) : []);
        // For quizzes, we use the CourseProgress.completedQuizzes Map for individual tracking
        const completedQuizIds = new Set(progress?.completedQuizzes ? Array.from(progress.completedQuizzes.keys()) : []);
        // Enhance course content with completion status
        const courseContent = result[0].courseContent.map((chapter) => ({
            ...chapter,
            chapterContent: chapter.chapterContent.map((item) => ({
                ...item,
                isCompleted: item.type === 'lecture'
                    ? completedLectureIds.has(item.lectureId?.toString())
                    : completedQuizIds.has(item.quizId?.toString())
            }))
        }));
        return {
            success: true,
            data: {
                _id: result[0]._id,
                courseTitle: result[0].title, // Match frontend expectation
                courseThumbnail: result[0].thumbnail, // Match frontend expectation
                courseContent: courseContent,
                isEnrolled: true,
                enrollmentDate: enrollment.enrollmentDate,
                paymentStatus: enrollment.paymentStatus,
                amountPaid: enrollment.amountPaid,
                enrollmentId: enrollment._id,
                progress: {
                    totalLectures,
                    completedLectures,
                    totalQuizzes,
                    completedQuizzes,
                    totalItems,
                    completedItems: totalCompletedItems,
                    completionPercentage,
                    quizzesCompleted: progress?.quizzesCompleted || false,
                    averageQuizScore: progress?.averageQuizScore || 0,
                    isCourseCompleted,
                    lastViewedLecture: progress?.lastViewedLecture || null,
                    rewardPoints: {
                        lecturePoints,
                        quizPoints,
                        completionBonus,
                        totalPoints: totalRewardPoints
                    }
                }
            },
            message: 'Enrolled course details retrieved successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to retrieve enrolled course details',
            errors: [error.message]
        };
    }
};
exports.getEnrolledCourseDetails = getEnrolledCourseDetails;
// Check if user is enrolled in a course
const checkEnrollmentStatus = async (courseId, userId) => {
    try {
        const enrollment = await enrollment_model_1.default.exists({
            student: new mongoose_1.Types.ObjectId(userId),
            course: new mongoose_1.Types.ObjectId(courseId)
        });
        return {
            success: true,
            data: !!enrollment,
            message: 'Enrollment status checked successfully'
        };
    }
    catch (error) {
        return {
            success: false,
            message: 'Failed to check enrollment status',
            errors: [error.message]
        };
    }
};
exports.checkEnrollmentStatus = checkEnrollmentStatus;
//# sourceMappingURL=enrollment.service.js.map