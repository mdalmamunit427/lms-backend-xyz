// Enhanced error handling utilities

import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';
import { HTTP_STATUS } from './constants';

export interface IError extends Error {
  statusCode: number;
}

export class AppError extends Error implements IError {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // This line makes sure the prototype chain is correctly set up
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle validation errors
 */
export const handleValidationError = (error: any): ErrorDetails => {
  const errors = Object.values(error.errors).map((err: any) => err.message);
  return {
    message: 'Validation failed',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    isOperational: true,
    errors
  };
};

/**
 * Handle duplicate key errors
 */
export const handleDuplicateKeyError = (error: any): ErrorDetails => {
  const field = Object.keys(error.keyValue || {})[0];
  const value = field ? error.keyValue[field] : 'unknown';
  return {
    message: `${field} '${value}' already exists`,
    statusCode: HTTP_STATUS.CONFLICT,
    isOperational: true
  };
};

/**
 * Handle cast errors
 */
export const handleCastError = (error: any): ErrorDetails => {
  return {
    message: `Invalid ${error.path}: ${error.value}`,
    statusCode: HTTP_STATUS.BAD_REQUEST,
    isOperational: true
  };
};

/**
 * Handle JWT errors
 */
export const handleJWTError = (): ErrorDetails => {
  return {
    message: 'Invalid token. Please log in again.',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    isOperational: true
  };
};

/**
 * Handle JWT expired errors
 */
export const handleJWTExpiredError = (): ErrorDetails => {
  return {
    message: 'Your token has expired. Please log in again.',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    isOperational: true
  };
};

/**
 * Send error response in development
 */
export const sendErrorDev = (err: ErrorDetails, res: Response) => {
  return sendError(
    res,
    err.message,
    err.statusCode,
    err.errors
  );
};

/**
 * Send error response in production
 */
export const sendErrorProd = (err: ErrorDetails, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return sendError(
      res,
      err.message,
      err.statusCode,
      err.errors
    );
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return sendError(
    res,
    'Something went wrong!',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};

/**
 * Global error handler
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  let errorDetails: ErrorDetails = {
    message: err.message,
    statusCode: err.statusCode,
    isOperational: err.isOperational || false,
    stack: err.stack
  };

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(errorDetails, res);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorDetails = handleValidationError(err);
  } else if (err.code === 11000) {
    errorDetails = handleDuplicateKeyError(err);
  } else if (err.name === 'CastError') {
    errorDetails = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError') {
    errorDetails = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    errorDetails = handleJWTExpiredError();
  }

  sendErrorProd(errorDetails, res);
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (err: any) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
};

/**
 * Create a custom error
 */
export const createError = (
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  isOperational: boolean = true
): AppError => {
  return new AppError(message, statusCode);
};

/**
 * Handle async errors with custom error handling
 */
export const asyncHandlerWithError = (
  fn: Function,
  errorMessage?: string,
  statusCode?: number
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (errorMessage) {
        const customError = createError(
          errorMessage,
          statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
        return next(customError);
      }
      next(err);
    });
  };
};
