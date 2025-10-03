import { Request, Response, NextFunction } from 'express';
import { validateCourseAndOwnership } from '../utils/ownership';
import { getUserId, getUserRole } from '../utils/common';
import { catchAsync } from './catchAsync';
import { AuthRequest } from './auth';
import mongoose from 'mongoose';

/**
 * Middleware to validate course ownership for analytics and statistics routes.
 * Only the course instructor or admin can access course analytics/stats.
 */
export const requireCourseOwnership = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const courseId = req.params.id as string;
  const userId = getUserId(req);
  const userRole = getUserRole(req) as 'admin' | 'instructor' | 'student';

  if (!courseId) {
    return next(new Error('Course ID is required'));
  }

  // Start a session for the ownership validation
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      await validateCourseAndOwnership(courseId, userId, userRole, session);
    });
    
    // If validation passes, continue to the next middleware/controller
    next();
  } catch (error) {
    next(error);
  } finally {
    await session.endSession();
  }
});
