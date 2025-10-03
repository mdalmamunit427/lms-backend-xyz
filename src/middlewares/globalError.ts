import { Request, Response, NextFunction } from 'express';
import { globalErrorHandler as enhancedGlobalErrorHandler } from '../utils/errorHandler';

// Use the enhanced functional error handler
export const globalErrorHandler = enhancedGlobalErrorHandler;