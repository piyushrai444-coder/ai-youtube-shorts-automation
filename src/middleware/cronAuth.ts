import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function cronAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const cronSecret = config.cron.secret;

  if (!cronSecret || cronSecret === 'yt-cron-secret-token-must-be-configured') {
    logger.warn('Cron request rejected: CRON_SECRET is not securely configured in environment.');
  }

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-cron-secret']) {
    token = String(req.headers['x-cron-secret']).trim();
  }

  if (!token || token !== cronSecret) {
    logger.warn(`Unauthorized cron attempt from IP ${req.ip} to ${req.path}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing cron secret authorization token',
    });
    return;
  }

  next();
}
