import { Request, Response } from 'express';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { logger } from '../utils/logger.js';

export class YouTubeController {
  async showYouTubeSettings(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await youtubeService.auth.isConnected();
      const channelInfo = await youtubeService.auth.getStoredChannelInfo();
      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('settings/youtube', {
        title: 'YouTube OAuth Connection',
        isConnected,
        channelInfo,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error loading YouTube settings: ${err.message}`);
      res.render('settings/youtube', {
        title: 'YouTube OAuth Connection',
        isConnected: false,
        channelInfo: null,
        error: err.message,
        success: null,
      });
    }
  }

  async connect(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = youtubeService.auth.getAuthUrl();
      res.redirect(authUrl);
    } catch (err: any) {
      logger.error(`YouTube connect redirect error: ${err.message}`);
      res.redirect(`/admin/settings/youtube?error=${encodeURIComponent(err.message)}`);
    }
  }

  async callback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      logger.warn(`Google OAuth error: ${error}`);
      return res.redirect(`/admin/settings/youtube?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect('/admin/settings/youtube?error=Missing+authorization+code');
    }

    try {
      const channelInfo = await youtubeService.auth.handleCallback(code);
      logger.info(`YouTube OAuth connected for channel: ${channelInfo.title}`);
      res.redirect('/admin/settings/youtube?success=YouTube+channel+connected+successfully!');
    } catch (err: any) {
      logger.error(`YouTube OAuth callback failure: ${err.message}`);
      res.redirect(`/admin/settings/youtube?error=${encodeURIComponent(err.message)}`);
    }
  }

  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      await youtubeService.auth.disconnect();
      res.redirect('/admin/settings/youtube?success=YouTube+channel+disconnected');
    } catch (err: any) {
      logger.error(`YouTube disconnect error: ${err.message}`);
      res.redirect(`/admin/settings/youtube?error=${encodeURIComponent(err.message)}`);
    }
  }
}

export const youtubeController = new YouTubeController();
