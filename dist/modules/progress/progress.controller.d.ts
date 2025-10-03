import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/auth";
interface ProgressAuthRequest extends AuthRequest {
    cacheKey?: string;
    params: {
        courseId?: string;
        lectureId?: string;
    };
    body: any;
}
export declare const updateLectureProgressHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const getCourseProgressHandler: (req: ProgressAuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUserDashboardHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const getCourseCompletionStatsHandler: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=progress.controller.d.ts.map