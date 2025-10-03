import stripe from "stripe";
import { Types } from "mongoose";
import { withTransaction } from "../../utils/withTransaction";
import Enrollment from "./enrollment.model";
import Course, { ICourse } from "../courses/course.model";
import { AppError } from "../../utils/errorHandler";
import { createError } from "../../utils/errorHandler";
import { getCache, invalidateCache, setCache } from "../../utils/cache";
import User from "../users/user.model";
import { sendEmail } from "../../utils/email";
import Coupon, { ICoupon } from "../coupons/coupon.model";
import { aggregateCourseDetailsWithEnrollment } from "../courses/course.repository";
import CourseProgress from "../progress/progress.model";
import Lecture from "../lectures/lecture.model";
import Quiz, { IQuiz } from "../quizes/quiz.model";
import { ServiceResponse } from "../../@types/api";

// === ATOMIC ENROLLMENT PROCESS ===
export const processEnrollment = async ({
  studentId,
  courseId,
  amountPaid,
  paymentStatus,
  couponId,
  stripeSessionId,
}: {
  studentId: string;
  courseId: string;
  amountPaid: number;
  paymentStatus: "paid" | "free";
  couponId?: string;
  stripeSessionId?: string;
}): Promise<ServiceResponse<any>> => {
  try {
    const enrollment = await withTransaction(async (session) => {
      // Final Correction: Use new Types.ObjectId() for robust query in a transaction
      const existingEnrollment = await Enrollment.findOne({
        student: new Types.ObjectId(studentId),
        course: new Types.ObjectId(courseId),
      }).session(session);
      if (existingEnrollment) {
        return existingEnrollment;
      }

      await Course.updateOne(
        { _id: courseId },
        { $inc: { enrollmentCount: 1 } },
        { session }
      );

      const courseCheck = await Course.findById(courseId).session(session);
      if (!courseCheck) {
        throw createError("Course not found during enrollment.", 404);
      }

      const enrollmentData = {
        student: studentId,
        course: courseId,
        amountPaid,
        paymentStatus,
        coupon: couponId,
        stripeSessionId,
      };
      const newEnrollment = await Enrollment.create([enrollmentData], {
        session,
      });

      await invalidateCache(`course:${courseId}`);
      await invalidateCache("courses:list");

      const student = await User.findById(studentId);
      const course = await Course.findById(courseId);

      if (student && course) {
        // Fire-and-forget email to avoid blocking the request
        sendEmail(student.email, "Enrollment Confirmed - CodeTutor LMS", "enrollment", {
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
  } catch (error: any) {
    return {
      success: false,
      message: 'Enrollment processing failed',
      errors: [error.message]
    };
  }
};

// Centralized price calculation logic
export const calculateFinalPrice = async (courseId: string, couponCode?: string): Promise<ServiceResponse<{ finalPrice: number; coupon: ICoupon | null; course: any }>> => {
  try {
    const cacheKey = `course:${courseId}`;
    let course: any; 
    
    // 1. OPTIMIZATION: Cache-First Read for Course Details
    const cachedCourse = await getCache<ICourse>(cacheKey);

    if (cachedCourse) {
      course = cachedCourse;
    } else {
      // Fallback to database if cache miss (Explicitly constructing ObjectId for safety)
      let objectId: Types.ObjectId;
      try {
        objectId = new Types.ObjectId(courseId);
      } catch (err) {
        // This path is usually not hit due to Zod validation, but kept for defensiveness
        throw new AppError("Invalid courseId format.", 400); 
      }
      
      const dbCourse = await Course.findById(objectId).lean();
      if (!dbCourse) {
        throw new AppError('Course not found', 404);
      }
      course = dbCourse;
      
      // Cache the course details for subsequent pricing checks (TTL: 1 hour)
      await setCache(cacheKey, course, 60 * 60); 
    }

    let finalPrice = course.price;

    // 2. Apply Course's Inherent Discount
    if (course.discount && course.discount > 0) {
      finalPrice -= (finalPrice * course.discount) / 100;
    }
    
    let coupon: ICoupon | null = null;
    
    // 3. Apply Coupon Code Discount (if provided)
    if (couponCode) {
      // Fetch coupon
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      
      const now = new Date();
      if (!coupon || (coupon.expiresAt && coupon.expiresAt < now)) {
        throw new AppError('Invalid or expired coupon', 400);
      }
      
      // Check specific course applicability (Handles 'all' vs. ObjectId)
      const appliesToValue = coupon.appliesTo;
      let couponAppliesToId: string = '';
      
      if (appliesToValue && typeof appliesToValue === 'object' && appliesToValue instanceof Types.ObjectId) {
          couponAppliesToId = appliesToValue.toString();
      } else if (typeof appliesToValue === 'string') {
          couponAppliesToId = appliesToValue;
      }

      if (couponAppliesToId !== 'all' && couponAppliesToId !== courseId) {
          throw new AppError('Coupon not valid for this course.', 400);
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
  } catch (error: any) {
    return {
      success: false,
      message: 'Price calculation failed',
      errors: [error.message]
    };
  }
};

export const createStripeSessionService = async (
  courseId: string,
  studentId: string,
  finalPrice: number,
  couponId?: string
): Promise<ServiceResponse<{ sessionId: string; sessionUrl: string | null }>> => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return {
        success: false,
        message: 'Course not found',
        errors: ['No course found with the provided ID']
      };
    }

    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);

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
  } catch (error: any) {
    return {
      success: false,
      message: 'Stripe session creation failed',
      errors: [error.message]
    };
  }
};

export const handleStripeWebhookService = async (event: stripe.Event): Promise<ServiceResponse<boolean>> => {
  try {
    if (event.type !== "checkout.session.completed") {
      return {
        success: true,
        data: true,
        message: 'Webhook event type not handled'
      };
    }
    const session = event.data.object as stripe.Checkout.Session;
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

    const enrollmentResult = await processEnrollment({
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
      await Coupon.findByIdAndUpdate(cleanCouponId, { $inc: { usageCount: 1 } });
      await invalidateCache(`coupon:${cleanCouponId}`);
    }

    return {
      success: true,
      data: true,
      message: 'Webhook processed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Webhook processing failed',
      errors: [error.message]
    };
  }
};

// === ENROLLED COURSES FUNCTIONALITY ===

// Get all enrolled courses for a user (lightweight list)
export const getEnrolledCoursesByUser = async (userId: string): Promise<ServiceResponse<any>> => {
  try {
  // Get all enrollments for the user with course details
  const enrollments = await Enrollment.find({ student: new Types.ObjectId(userId) })
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
  const enrolledCourses = await Promise.all(
    validEnrollments.map(async (enrollment) => {
      const course = enrollment.course as any; // Type assertion for populated course
      const courseId = course._id.toString();
      
      // Get lecture count and user's progress for this course
      const [courseStats, progress] = await Promise.all([
        Course.aggregate([
          { $match: { _id: new Types.ObjectId(courseId) } },
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
        CourseProgress.findOne({
          user: new Types.ObjectId(userId),
          course: new Types.ObjectId(courseId)
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
    })
  );

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
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve enrolled courses',
      errors: [error.message]
    };
  }
};

// Get specific enrolled course with course content only (for course player)
export const getEnrolledCourseDetails = async (courseId: string, userId: string): Promise<ServiceResponse<any>> => {
  try {
  // Verify enrollment
  const enrollment = await Enrollment.findOne({
    student: new Types.ObjectId(userId),
    course: new Types.ObjectId(courseId)
  });

  if (!enrollment) {
    throw createError('Course not found or not enrolled', 404);
  }

  // Get course content only using aggregation pipeline
  const result = await Course.aggregate([
    { $match: { _id: new Types.ObjectId(courseId) } },
    
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
    throw new AppError('Course not found', 404);
  }

  // Get course progress
  const progress = await CourseProgress.findOne({
    user: new Types.ObjectId(userId),
    course: new Types.ObjectId(courseId)
  });

  // Get all lectures and quizzes for this course to calculate progress
  const [allLectures, allQuizzes] = await Promise.all([
    Lecture.find({ course: courseId }).select('_id').lean(),
    Quiz.find({ course: courseId }).select('_id').lean()
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
  const completedLectureIds = new Set(
    progress?.completedLectures ? Array.from(progress.completedLectures.keys()) : []
  );

  // For quizzes, we use the CourseProgress.completedQuizzes Map for individual tracking
  const completedQuizIds = new Set(
    progress?.completedQuizzes ? Array.from(progress.completedQuizzes.keys()) : []
  );

  // Enhance course content with completion status
  const courseContent = result[0].courseContent.map((chapter: any) => ({
    ...chapter,
    chapterContent: chapter.chapterContent.map((item: any) => ({
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
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to retrieve enrolled course details',
      errors: [error.message]
    };
  }
};

// Check if user is enrolled in a course
export const checkEnrollmentStatus = async (courseId: string, userId: string): Promise<ServiceResponse<boolean>> => {
  try {
    const enrollment = await Enrollment.exists({
      student: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId)
    });
    
    return {
      success: true,
      data: !!enrollment,
      message: 'Enrollment status checked successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to check enrollment status',
      errors: [error.message]
    };
  }
};
