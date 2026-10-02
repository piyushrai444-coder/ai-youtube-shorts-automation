import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/UserRepository.js';
import { settingRepository } from '../repositories/SettingRepository.js';
import { logger } from '../utils/logger.js';

export class AuthController {
  async showLogin(req: Request, res: Response): Promise<void> {
    const error = req.query.error as string;
    const redirect = req.query.redirect as string || '/admin';
    res.render('login', {
      title: 'Admin Login',
      error: error ? decodeURIComponent(error) : null,
      redirect,
    });
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, redirect } = req.body;

      if (!username || !password) {
        return res.render('login', {
          title: 'Admin Login',
          error: 'Username and password are required',
          redirect: redirect || '/admin',
        });
      }

      const user = await userRepository.findByUsername(username.trim());
      if (!user) {
        logger.warn(`Failed login attempt for username: ${username}`);
        return res.render('login', {
          title: 'Admin Login',
          error: 'Invalid username or password',
          redirect: redirect || '/admin',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        logger.warn(`Failed password check for username: ${username}`);
        return res.render('login', {
          title: 'Admin Login',
          error: 'Invalid username or password',
          redirect: redirect || '/admin',
        });
      }

      // Establish session
      req.session.userId = user.id;
      req.session.username = user.username;

      if (typeof req.session.save === 'function') {
        req.session.save((err) => {
          if (err) {
            logger.error(`Session save error for user "${user.username}": ${err.message}`);
            return res.render('login', {
              title: 'Admin Login',
              error: 'Session persistence error. Please try again.',
              redirect: redirect || '/admin',
            });
          }
          logger.info(`Admin user "${user.username}" logged in successfully`);
          res.redirect(redirect || '/admin');
        });
      } else {
        logger.info(`Admin user "${user.username}" logged in successfully`);
        res.redirect(redirect || '/admin');
      }
    } catch (err: any) {
      logger.error(`Login error: ${err.message}`);
      res.render('login', {
        title: 'Admin Login',
        error: 'An internal error occurred during login',
        redirect: '/admin',
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const username = req.session?.username;
    if (typeof req.session?.destroy === 'function') {
      req.session.destroy((err) => {
        if (err) {
          logger.warn(`Session destroy error: ${err.message}`);
        }
        res.clearCookie('ai_shorts_sid');
        logger.info(`User ${username} logged out`);
        res.redirect('/admin/login');
      });
    } else {
      res.clearCookie('ai_shorts_sid');
      res.redirect('/admin/login');
    }
  }

  async showSetup(req: Request, res: Response): Promise<void> {
    const count = await userRepository.count();
    if (count > 0) {
      return res.redirect('/admin/login');
    }
    res.render('setup', {
      title: 'Welcome Setup Wizard',
      error: null,
    });
  }

  async setup(req: Request, res: Response): Promise<void> {
    try {
      const count = await userRepository.count();
      if (count > 0) {
        return res.redirect('/admin/login');
      }

      const {
        username,
        password,
        confirmPassword,
        llmProvider,
        llmApiKey,
        cronSecret,
        channelName,
      } = req.body;

      if (!username || !password) {
        return res.render('setup', {
          title: 'Welcome Setup Wizard',
          error: 'Username and password are required',
        });
      }

      if (password.length < 8) {
        return res.render('setup', {
          title: 'Welcome Setup Wizard',
          error: 'Password must be at least 8 characters long',
        });
      }

      if (password !== confirmPassword) {
        return res.render('setup', {
          title: 'Welcome Setup Wizard',
          error: 'Passwords do not match',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create(username.trim(), passwordHash);

      // Save optional setup settings
      if (llmProvider) await settingRepository.set('llm_provider', llmProvider);
      if (llmApiKey) await settingRepository.setSecure('llm_api_key', llmApiKey);
      if (cronSecret) await settingRepository.set('cron_secret', cronSecret);
      if (channelName) await settingRepository.set('channel_name', channelName);

      req.session.userId = user.id;
      req.session.username = user.username;

      if (typeof req.session.save === 'function') {
        req.session.save((err) => {
          if (err) {
            logger.error(`Setup session save error: ${err.message}`);
          }
          logger.info(`First-time setup completed. Created admin user "${user.username}"`);
          res.redirect('/admin');
        });
      } else {
        logger.info(`First-time setup completed. Created admin user "${user.username}"`);
        res.redirect('/admin');
      }
    } catch (err: any) {
      logger.error(`Setup wizard error: ${err.message}`);
      res.render('setup', {
        title: 'Welcome Setup Wizard',
        error: `Setup error: ${err.message}`,
      });
    }
  }
}

export const authController = new AuthController();
