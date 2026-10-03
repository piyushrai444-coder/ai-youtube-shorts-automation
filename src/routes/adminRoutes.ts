import { Router } from 'express';
import { adminController } from '../controllers/AdminController.js';
import { requireAuth } from '../middleware/auth.js';

export const adminRouter = Router();

// Apply requireAuth to all /admin/* routes in this router
adminRouter.use('/admin', requireAuth);

adminRouter.get('/admin', (req, res) => adminController.showDashboard(req, res));
adminRouter.get('/admin/shorts', (req, res) => adminController.listShorts(req, res));
adminRouter.get('/admin/shorts/:id', (req, res) => adminController.showShortDetail(req, res));

adminRouter.get('/admin/analytics', (req, res) => adminController.showAnalytics(req, res));
adminRouter.post('/admin/analytics/sync', (req, res) => adminController.triggerSyncAnalytics(req, res));

adminRouter.get('/admin/topics', (req, res) => adminController.showTopics(req, res));
adminRouter.get('/admin/learning', (req, res) => adminController.showLearning(req, res));

adminRouter.post('/admin/shorts/generate', (req, res) => adminController.generateManual(req, res));
adminRouter.post('/admin/shorts/:id/retry', (req, res) => adminController.retryShort(req, res));
adminRouter.post('/admin/shorts/:id/regenerate', (req, res) => adminController.retryShort(req, res));
adminRouter.post('/admin/shorts/:id/upload', (req, res) => adminController.uploadPendingShort(req, res));
adminRouter.post('/admin/shorts/:id/delete', (req, res) => adminController.deleteShort(req, res));

adminRouter.get('/admin/settings', (req, res) => adminController.showSettings(req, res));
adminRouter.post('/admin/settings', (req, res) => adminController.saveSettings(req, res));
