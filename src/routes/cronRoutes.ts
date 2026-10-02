import { Router } from 'express';
import { cronController } from '../controllers/CronController.js';
import { cronAuth } from '../middleware/cronAuth.js';
import { cronLimiter } from '../middleware/rateLimiter.js';

export const cronRouter = Router();

// Protected cron-job.org endpoints with rate limiting and secret validation
cronRouter.post(
  '/api/cron/generate-short-1',
  cronLimiter,
  cronAuth,
  (req, res) => cronController.handleShort1(req, res)
);

cronRouter.post(
  '/api/cron/generate-short-2',
  cronLimiter,
  cronAuth,
  (req, res) => cronController.handleShort2(req, res)
);

cronRouter.post(
  '/api/cron/generate',
  cronLimiter,
  cronAuth,
  (req, res) => cronController.handleGenericCron(req, res)
);
