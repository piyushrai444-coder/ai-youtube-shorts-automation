import { Router } from 'express';
import { authController } from '../controllers/AuthController.js';
import { redirectIfAuthenticated } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.get('/admin/login', redirectIfAuthenticated, (req, res) => authController.showLogin(req, res));
authRouter.post('/admin/login', loginLimiter, (req, res) => authController.login(req, res));
authRouter.post('/admin/logout', (req, res) => authController.logout(req, res));

authRouter.get('/admin/setup', redirectIfAuthenticated, (req, res) => authController.showSetup(req, res));
authRouter.post('/admin/setup', (req, res) => authController.setup(req, res));
