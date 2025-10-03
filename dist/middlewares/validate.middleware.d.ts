import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
export declare const validate: (schema: ZodObject<any, any>) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.middleware.d.ts.map