import { Response, NextFunction } from 'express';
import { validateCourseAndOwnership } from '../utils/ownership';
import { getUserId, getUserRole } from '../utils/common';
import { catchAsync } from './catchAsync';
import { AuthRequest } from './auth';
import { createError } from '../utils/errorHandler';

export const requireCourseOwnership = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const courseId = req.params.id;
  const userId = getUserId(req);
  const userRole = getUserRole(req) as 'admin' | 'instructor' | 'student';

  if (!courseId) {
    throw createError('Course ID is required', 400);
  }

  await validateCourseAndOwnership(courseId, userId, userRole);
  next();
});
