import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to validate course ownership for analytics and statistics routes.
 * Only the course instructor or admin can access course analytics/stats.
 */
export declare const requireCourseOwnership: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=courseOwnership.middleware.d.ts.map