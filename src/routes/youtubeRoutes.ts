import { Router } from 'express';
import { youtubeController } from '../controllers/YouTubeController.js';
import { requireAuth } from '../middleware/auth.js';

export const youtubeRouter = Router();

youtubeRouter.get('/admin/settings/youtube', requireAuth, (req, res) => youtubeController.showYouTubeSettings(req, res));
youtubeRouter.post('/admin/settings/youtube/credentials', requireAuth, (req, res) => youtubeController.saveCredentials(req, res));
youtubeRouter.get('/admin/youtube/connect', requireAuth, (req, res) => youtubeController.connect(req, res));
youtubeRouter.get('/admin/youtube/callback', (req, res) => youtubeController.callback(req, res));
youtubeRouter.post('/admin/youtube/disconnect', requireAuth, (req, res) => youtubeController.disconnect(req, res));
