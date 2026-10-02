import { Router } from 'express';
import { cronController } from '../controllers/CronController.js';
import { cronAuth } from '../middleware/cronAuth.js';
import { cronLimiter } from '../middleware/rateLimiter.js';

import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/UserRepository.js';

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

// Protected Admin diagnostic & emergency password reset endpoints
cronRouter.get('/api/admin/users', cronAuth, async (req, res) => {
  try {
    const users = await userRepository.listAll();
    res.json({
      count: users.length,
      users: users.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cronRouter.post('/api/admin/reset-password', cronAuth, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Both username and password are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      await userRepository.updatePassword(existing.id, passwordHash);
      return res.json({ success: true, message: `Password reset successfully for user "${existing.username}"` });
    } else {
      const created = await userRepository.create(username.trim(), passwordHash);
      return res.json({ success: true, message: `Created new admin user "${created.username}"` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
