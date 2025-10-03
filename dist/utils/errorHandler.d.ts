import { Request, Response, NextFunction } from 'express';
export interface IError extends Error {
    statusCode: number;
}
export declare class AppError extends Error implements IError {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export interface ErrorDetails {
    message: string;
    statusCode: number;
    isOperational: boolean;
    stack?: string;
    errors?: string[];
}
/**
 * Handle async errors
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Handle validation errors
 */
export declare const handleValidationError: (error: any) => ErrorDetails;
/**
 * Handle duplicate key errors
 */
export declare const handleDuplicateKeyError: (error: any) => ErrorDetails;
/**
 * Handle cast errors
 */
export declare const handleCastError: (error: any) => ErrorDetails;
/**
 * Handle JWT errors
 */
export declare const handleJWTError: () => ErrorDetails;
/**
 * Handle JWT expired errors
 */
export declare const handleJWTExpiredError: () => ErrorDetails;
/**
 * Send error response in development
 */
export declare const sendErrorDev: (err: ErrorDetails, res: Response) => Response<any, Record<string, any>>;
/**
 * Send error response in production
 */
export declare const sendErrorProd: (err: ErrorDetails, res: Response) => Response<any, Record<string, any>>;
/**
 * Global error handler
 */
export declare const globalErrorHandler: (err: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Handle unhandled promise rejections
 */
export declare const handleUnhandledRejection: () => void;
/**
 * Handle uncaught exceptions
 */
export declare const handleUncaughtException: () => void;
/**
 * Create a custom error
 */
export declare const createError: (message: string, statusCode?: number, isOperational?: boolean) => AppError;
/**
 * Handle async errors with custom error handling
 */
export declare const asyncHandlerWithError: (fn: Function, errorMessage?: string, statusCode?: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map