import { Request, Response } from 'express';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { logger } from '../utils/logger.js';

import { settingRepository } from '../repositories/SettingRepository.js';
import { config } from '../config/index.js';

export class YouTubeController {
  async showYouTubeSettings(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await youtubeService.auth.isConnected();
      const channelInfo = await youtubeService.auth.getStoredChannelInfo();
      const dbClientId = await settingRepository.get('google_client_id');
      const hasClientId = !!(config.youtube.clientId || dbClientId);
      const hasClientSecret = !!(config.youtube.clientSecret || await settingRepository.getSecure('google_client_secret'));
      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('settings/youtube', {
        title: 'YouTube OAuth Connection',
        isConnected,
        channelInfo,
        hasCredentials: hasClientId && hasClientSecret,
        clientId: config.youtube.clientId || dbClientId || '',
        redirectUri: config.youtube.redirectUri || `${config.appUrl}/admin/youtube/callback`,
        appUrl: config.appUrl,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error loading YouTube settings: ${err.message}`);
      res.render('settings/youtube', {
        title: 'YouTube OAuth Connection',
        isConnected: false,
        channelInfo: null,
        hasCredentials: false,
        clientId: '',
        redirectUri: `${config.appUrl}/admin/youtube/callback`,
        appUrl: config.appUrl,
        error: err.message,
        success: null,
      });
    }
  }

  async saveCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { googleClientId, googleClientSecret } = req.body;
      if (googleClientId && googleClientId.trim()) {
        await settingRepository.set('google_client_id', googleClientId.trim());
      }
      if (googleClientSecret && googleClientSecret.trim()) {
        await settingRepository.setSecure('google_client_secret', googleClientSecret.trim());
      }
      res.redirect('/admin/settings/youtube?success=Google+OAuth+credentials+saved+successfully!');
    } catch (err: any) {
      logger.error(`Error saving Google credentials: ${err.message}`);
      res.redirect(`/admin/settings/youtube?error=${encodeURIComponent(err.message)}`);
    }
  }

  async connect(req: Request, res: Response): Promise<void> {
    try {
      await youtubeService.auth.ensureCredentialsLoaded();
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
