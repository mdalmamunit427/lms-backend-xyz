import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './middlewares/globalError';
import userRoutes from './modules/users/user.routes';
import coursesRoutes from './modules/courses/course.routes';
import enrollmentRoutes from './modules/enrollments/enrollment.routes';
import couponRoutes from './modules/coupons/coupon.routes';
import { handleStripeWebhook } from './modules/enrollments/enrollment.controller';
import chaptersRoutes from "./modules/chapters/chapter.routes";
import lecturesRoutes from "./modules/lectures/lecture.routes";
import quizRoutes from "./modules/quizes/quiz.routes";
import progressRoutes from "./modules/progress/progress.routes";
import discussionRoutes from "./modules/discussions/discussion.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import certificateRoutes from './modules/certificates/certificate.routes';
import notificationRoutes from './modules/notifications/notification.routes';

const app = express();

app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// routes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/courses", coursesRoutes);
app.use("/api/v1/enrollment", enrollmentRoutes);
app.use("/api/v1/coupon", couponRoutes);
app.use("/api/v1/chapters", chaptersRoutes);
app.use("/api/v1/lectures", lecturesRoutes);
app.use("/api/v1/quizzes", quizRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/discussions", discussionRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/certificates", certificateRoutes);
app.use("/api/v1/notifications", notificationRoutes);


app.use(globalErrorHandler);

app.get("/", (_req: Request, res:Response) => {
  res.send("LMS Backend Server is Running...")
})

export default app;