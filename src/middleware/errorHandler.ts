import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
    stack: err.stack,
  });

  if (res.headersSent) {
    return next(err);
  }

  const isApi = req.path.startsWith('/api/') || req.headers.accept?.includes('application/json');

  if (isApi) {
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  } else {
    res.status(err.status || 500).render('error', {
      title: 'Error',
      message: err.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }
}
