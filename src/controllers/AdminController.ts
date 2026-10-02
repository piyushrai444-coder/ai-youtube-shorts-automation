import { Request, Response } from 'express';
import { shortRepository } from '../repositories/ShortRepository.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { settingRepository } from '../repositories/SettingRepository.js';
import { jobScheduler } from '../jobs/JobScheduler.js';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { getCurrentSlotDate } from '../utils/timezone.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ShortStatus } from '@prisma/client';

export class AdminController {
  async showDashboard(req: Request, res: Response): Promise<void> {
    try {
      const todayDate = getCurrentSlotDate();
      const stats = await shortRepository.getTodayStats(todayDate);
      const recentShorts = await shortRepository.listRecent(8);
      const recentJobs = await jobRepository.listRecent(5);
      const isYouTubeConnected = await youtubeService.auth.isConnected();
      const channelInfo = await youtubeService.auth.getStoredChannelInfo();

      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('dashboard', {
        title: 'Dashboard',
        stats,
        recentShorts,
        recentJobs,
        isYouTubeConnected,
        channelInfo,
        schedule: {
          short1: config.cron.short1Time,
          short2: config.cron.short2Time,
          timezone: config.cron.timezone,
        },
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error rendering admin dashboard: ${err.message}`);
      res.status(500).render('error', { title: 'Dashboard Error', message: err.message });
    }
  }

  async listShorts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = 15;
      const offset = (page - 1) * limit;
      const statusFilter = req.query.status as ShortStatus | undefined;

      const shorts = await shortRepository.listRecent(limit, offset, statusFilter);
      const totalCount = await shortRepository.countTotal(statusFilter);
      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('shorts/index', {
        title: 'All YouTube Shorts',
        shorts,
        currentPage: page,
        totalPages,
        currentStatus: statusFilter || '',
      });
    } catch (err: any) {
      logger.error(`Error listing shorts: ${err.message}`);
      res.status(500).render('error', { title: 'Shorts Error', message: err.message });
    }
  }

  async showShortDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const short = await shortRepository.findById(id);

      if (!short) {
        return res.status(404).render('error', {
          title: 'Not Found',
          message: `Short with ID ${id} not found`,
        });
      }

      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('shorts/detail', {
        title: short.title || 'Short Details',
        short,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error showing short detail: ${err.message}`);
      res.status(500).render('error', { title: 'Short Detail Error', message: err.message });
    }
  }

  async generateManual(req: Request, res: Response): Promise<void> {
    try {
      const category = req.body.category as string;
      const result = await jobScheduler.triggerSlot('manual', category);
      logger.info(`Manual generation triggered: ${result.slotKey}`);
      res.redirect('/admin?success=Manual+generation+started!+The+pipeline+is+running+in+the+background.');
    } catch (err: any) {
      logger.error(`Manual generation trigger error: ${err.message}`);
      res.redirect(`/admin?error=${encodeURIComponent(err.message)}`);
    }
  }

  async retryShort(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      await jobScheduler.retryShort(id);
      res.redirect(`/admin/shorts/${id}?success=Retry+job+queued+successfully`);
    } catch (err: any) {
      logger.error(`Retry error for short ${req.params.id}: ${err.message}`);
      res.redirect(`/admin/shorts/${req.params.id}?error=${encodeURIComponent(err.message)}`);
    }
  }

  async uploadPendingShort(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const short = await shortRepository.findById(id);
      if (!short) {
        return res.redirect('/admin/shorts?error=Short+not+found');
      }

      // If YouTube is connected, trigger upload
      const isConnected = await youtubeService.auth.isConnected();
      if (!isConnected) {
        return res.redirect(`/admin/shorts/${id}?error=YouTube+is+not+connected.+Please+connect+YouTube+first.`);
      }

      await jobScheduler.retryShort(id);
      res.redirect(`/admin/shorts/${id}?success=Upload+process+initiated+in+background`);
    } catch (err: any) {
      logger.error(`Upload short error: ${err.message}`);
      res.redirect(`/admin/shorts/${req.params.id}?error=${encodeURIComponent(err.message)}`);
    }
  }

  async deleteShort(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      await shortRepository.delete(id);
      res.redirect('/admin/shorts?success=Short+deleted+successfully');
    } catch (err: any) {
      logger.error(`Delete short error: ${err.message}`);
      res.redirect(`/admin/shorts?error=${encodeURIComponent(err.message)}`);
    }
  }

  async showSettings(req: Request, res: Response): Promise<void> {
    try {
      const dbSettings = await settingRepository.getAll();
      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('settings/index', {
        title: 'Platform Settings',
        settings: {
          ...config,
          db: dbSettings,
        },
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error loading settings: ${err.message}`);
      res.status(500).render('error', { title: 'Settings Error', message: err.message });
    }
  }

  async saveSettings(req: Request, res: Response): Promise<void> {
    try {
      const {
        channelName,
        watermarkText,
        defaultCta,
        short1Time,
        short2Time,
        llmProvider,
        llmModel,
        ttsVoice,
        enableBackgroundMusic,
      } = req.body;

      if (channelName) await settingRepository.set('channel_name', channelName);
      if (watermarkText) await settingRepository.set('watermark_text', watermarkText);
      if (defaultCta) await settingRepository.set('default_cta', defaultCta);
      if (short1Time) await settingRepository.set('short_1_time', short1Time);
      if (short2Time) await settingRepository.set('short_2_time', short2Time);
      if (llmProvider) await settingRepository.set('llm_provider', llmProvider);
      if (llmModel) await settingRepository.set('llm_model', llmModel);
      if (ttsVoice) await settingRepository.set('tts_voice', ttsVoice);
      await settingRepository.set('enable_background_music', enableBackgroundMusic === 'on' ? 'true' : 'false');

      res.redirect('/admin/settings?success=Settings+updated+successfully');
    } catch (err: any) {
      logger.error(`Error saving settings: ${err.message}`);
      res.redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
    }
  }
}

export const adminController = new AdminController();
