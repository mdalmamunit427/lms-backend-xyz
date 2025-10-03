"use strict";
// Enhanced error handling utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandlerWithError = exports.createError = exports.handleUncaughtException = exports.handleUnhandledRejection = exports.globalErrorHandler = exports.sendErrorProd = exports.sendErrorDev = exports.handleJWTExpiredError = exports.handleJWTError = exports.handleCastError = exports.handleDuplicateKeyError = exports.handleValidationError = exports.asyncHandler = exports.AppError = void 0;
const response_1 = require("./response");
const constants_1 = require("./constants");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        // This line makes sure the prototype chain is correctly set up
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
/**
 * Handle async errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Handle validation errors
 */
const handleValidationError = (error) => {
    const errors = Object.values(error.errors).map((err) => err.message);
    return {
        message: 'Validation failed',
        statusCode: constants_1.HTTP_STATUS.BAD_REQUEST,
        isOperational: true,
        errors
    };
};
exports.handleValidationError = handleValidationError;
/**
 * Handle duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyValue || {})[0];
    const value = field ? error.keyValue[field] : 'unknown';
    return {
        message: `${field} '${value}' already exists`,
        statusCode: constants_1.HTTP_STATUS.CONFLICT,
        isOperational: true
    };
};
exports.handleDuplicateKeyError = handleDuplicateKeyError;
/**
 * Handle cast errors
 */
const handleCastError = (error) => {
    return {
        message: `Invalid ${error.path}: ${error.value}`,
        statusCode: constants_1.HTTP_STATUS.BAD_REQUEST,
        isOperational: true
    };
};
exports.handleCastError = handleCastError;
/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return {
        message: 'Invalid token. Please log in again.',
        statusCode: constants_1.HTTP_STATUS.UNAUTHORIZED,
        isOperational: true
    };
};
exports.handleJWTError = handleJWTError;
/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = () => {
    return {
        message: 'Your token has expired. Please log in again.',
        statusCode: constants_1.HTTP_STATUS.UNAUTHORIZED,
        isOperational: true
    };
};
exports.handleJWTExpiredError = handleJWTExpiredError;
/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
    return (0, response_1.sendError)(res, err.message, err.statusCode, err.errors);
};
exports.sendErrorDev = sendErrorDev;
/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        return (0, response_1.sendError)(res, err.message, err.statusCode, err.errors);
    }
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return (0, response_1.sendError)(res, 'Something went wrong!', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
};
exports.sendErrorProd = sendErrorProd;
/**
 * Global error handler
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
    err.status = err.status || 'error';
    let errorDetails = {
        message: err.message,
        statusCode: err.statusCode,
        isOperational: err.isOperational || false,
        stack: err.stack
    };
    if (process.env.NODE_ENV === 'development') {
        return (0, exports.sendErrorDev)(errorDetails, res);
    }
    // Handle specific error types
    if (err.name === 'ValidationError') {
        errorDetails = (0, exports.handleValidationError)(err);
    }
    else if (err.code === 11000) {
        errorDetails = (0, exports.handleDuplicateKeyError)(err);
    }
    else if (err.name === 'CastError') {
        errorDetails = (0, exports.handleCastError)(err);
    }
    else if (err.name === 'JsonWebTokenError') {
        errorDetails = (0, exports.handleJWTError)();
    }
    else if (err.name === 'TokenExpiredError') {
        errorDetails = (0, exports.handleJWTExpiredError)();
    }
    (0, exports.sendErrorProd)(errorDetails, res);
};
exports.globalErrorHandler = globalErrorHandler;
/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (err) => {
        console.log('UNHANDLED REJECTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        process.exit(1);
    });
};
exports.handleUnhandledRejection = handleUnhandledRejection;
/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        process.exit(1);
    });
};
exports.handleUncaughtException = handleUncaughtException;
/**
 * Create a custom error
 */
const createError = (message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) => {
    return new AppError(message, statusCode);
};
exports.createError = createError;
/**
 * Handle async errors with custom error handling
 */
const asyncHandlerWithError = (fn, errorMessage, statusCode) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((err) => {
            if (errorMessage) {
                const customError = (0, exports.createError)(errorMessage, statusCode || constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
                return next(customError);
            }
            next(err);
        });
    };
};
exports.asyncHandlerWithError = asyncHandlerWithError;
//# sourceMappingURL=errorHandler.js.map