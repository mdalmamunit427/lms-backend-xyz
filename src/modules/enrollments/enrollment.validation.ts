import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required.'),
    couponCode: z.string().optional(),
  }),
});

export const getUserEnrolledCoursesSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required.'),
  }),
});

export const getEnrolledCourseDetailsSchema = z.object({
  params: z.object({
    courseId: z.string().min(1, 'Course ID is required.'),
  }),
});