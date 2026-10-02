import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/UserRepository.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session && req.session.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      username: req.session.username,
    };
    return next();
  }

  // Check if first-time setup is needed
  try {
    const userCount = await userRepository.count();
    if (userCount === 0) {
      return res.redirect('/admin/setup');
    }
  } catch {}

  res.redirect(`/admin/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  next();
}
