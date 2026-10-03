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

import { learningRepository } from '../repositories/LearningRepository.js';
import { topicRepository } from '../repositories/TopicRepository.js';
import { youtubeAnalyticsService } from '../services/youtube/YouTubeAnalyticsService.js';
import { performanceAnalyst } from '../services/learning/PerformanceAnalyst.js';
import { characterManager } from '../services/cartoon/CharacterManager.js';
import { storyRepository } from '../repositories/StoryRepository.js';
import { fatigueDetector } from '../services/cartoon/FatigueDetector.js';


export class AdminController {
  async showDashboard(req: Request, res: Response): Promise<void> {
    try {
      const todayDate = getCurrentSlotDate();
      const stats = await shortRepository.getTodayStats(todayDate);
      const recentShorts = await shortRepository.listRecent(8);
      const recentJobs = await jobRepository.listRecent(5);
      const isYouTubeConnected = await youtubeService.auth.isConnected();
      const channelInfo = await youtubeService.auth.getStoredChannelInfo();
      const hasAiKey = !!(config.llm.apiKey || (await settingRepository.getSecure('llm_api_key')));
      const activeInsights = await learningRepository.getActiveInsights();
      const activeExperiments = await learningRepository.getActiveExperiments();
      const recentRuns = await learningRepository.getRecentStrategyRuns(3);

      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('dashboard', {
        title: 'Dashboard',
        stats,
        recentShorts,
        recentJobs,
        isYouTubeConnected,
        channelInfo,
        hasAiKey,
        activeInsights,
        activeExperiments,
        recentRuns,
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

  async showAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const shorts = await shortRepository.listUploadedForAnalysis(50);
      const snapshots = await learningRepository.getLatestSnapshots(30);

      // Compute channel-level summary
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let sumApv = 0;
      let countWithApv = 0;

      for (const s of shorts) {
        const snap = s.performanceSnapshots[0];
        if (snap) {
          totalViews += snap.views;
          totalLikes += snap.likes;
          totalComments += snap.comments;
          if (snap.avgPercentageViewed) {
            sumApv += snap.avgPercentageViewed;
            countWithApv++;
          }
        }
      }

      const avgChannelApv = countWithApv > 0 ? Math.round((sumApv / countWithApv) * 10) / 10 : 0;

      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('analytics/index', {
        title: 'YouTube Shorts Analytics',
        shorts,
        snapshots,
        channelSummary: {
          totalViews,
          totalLikes,
          totalComments,
          avgChannelApv,
          totalTracked: shorts.length,
        },
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error showing analytics: ${err.message}`);
      res.status(500).render('error', { title: 'Analytics Error', message: err.message });
    }
  }

  async showTopics(req: Request, res: Response): Promise<void> {
    try {
      const topics = await topicRepository.listRecent(50);
      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('topics/index', {
        title: 'Topic Intelligence & Trend Scoring',
        topics,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error showing topics: ${err.message}`);
      res.status(500).render('error', { title: 'Topics Error', message: err.message });
    }
  }

  async showLearning(req: Request, res: Response): Promise<void> {
    try {
      const insights = await learningRepository.getActiveInsights();
      const experiments = await learningRepository.getActiveExperiments();
      const strategyRuns = await learningRepository.getRecentStrategyRuns(15);
      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('learning/index', {
        title: 'Self-Learning System & Memory',
        insights,
        experiments,
        strategyRuns,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error showing learning panel: ${err.message}`);
      res.status(500).render('error', { title: 'Learning Memory Error', message: err.message });
    }
  }

  async triggerSyncAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const snapshotResult = await youtubeAnalyticsService.updateAllRecentSnapshots(20);
      const analysisResult = await performanceAnalyst.analyzeChannelPerformance();

      res.redirect(
        `/admin/analytics?success=Analytics+synced!+Updated+${snapshotResult.updatedCount}+snapshots+and+derived+${analysisResult.patternsIdentified}+learning+patterns.`
      );
    } catch (err: any) {
      logger.error(`Manual analytics sync error: ${err.message}`);
      res.redirect(`/admin/analytics?error=${encodeURIComponent(err.message)}`);
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
      const hasAiKey = !!(config.llm.apiKey || (await settingRepository.getSecure('llm_api_key')));
      if (!hasAiKey) {
        return res.redirect('/admin/settings?error=Please+configure+your+Google+Gemini+API+Key+(or+OpenAI+Key)+below+before+generating+Shorts.');
      }

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

  async showCartoons(req: Request, res: Response): Promise<void> {
    try {
      await characterManager.ensureSeeded();
      const characters = await characterManager.getAllCharacters();
      const storyIdeas = await storyRepository.findAllIdeas(undefined, 20);
      const cartoonShorts = await shortRepository.listRecent(15);
      const fatigue = await fatigueDetector.checkFatigue();
      const contentMode = (await settingRepository.get('content_mode')) || config.contentMode || 'cartoon';

      const success = req.query.success as string;
      const error = req.query.error as string;

      res.render('cartoons/index', {
        title: 'Cartoon Factory',
        characters,
        storyIdeas,
        cartoonShorts: cartoonShorts.filter((s) => s.contentMode === 'cartoon'),
        fatigue,
        contentMode,
        success,
        error,
      });
    } catch (err: any) {
      logger.error(`Error loading cartoon dashboard: ${err.message}`);
      res.status(500).render('error', { title: 'Cartoon Factory Error', message: err.message });
    }
  }

  async generateManualCartoon(req: Request, res: Response): Promise<void> {
    try {
      const result = await jobScheduler.triggerSlot('manual', undefined, 'cartoon');
      if (result.accepted) {
        res.redirect('/admin/cartoons?success=Cartoon+Short+generation+started+in+background');
      } else {
        res.redirect(`/admin/cartoons?error=${encodeURIComponent(result.message)}`);
      }
    } catch (err: any) {
      logger.error(`Manual cartoon generation failed: ${err.message}`);
      res.redirect(`/admin/cartoons?error=${encodeURIComponent(err.message)}`);
    }
  }

  async saveSettings(req: Request, res: Response): Promise<void> {
    try {
      const {
        channelName,
        watermarkText,
        defaultCta,
        contentMode,
        short1Time,
        short2Time,
        llmProvider,
        llmModel,
        llmApiKey,
        ttsProvider,
        ttsVoice,
        ttsApiKey,
        enableBackgroundMusic,
      } = req.body;

      if (channelName) await settingRepository.set('channel_name', channelName);
      if (watermarkText) await settingRepository.set('watermark_text', watermarkText);
      if (defaultCta) await settingRepository.set('default_cta', defaultCta);
      if (contentMode) await settingRepository.set('content_mode', contentMode);
      if (short1Time) await settingRepository.set('short_1_time', short1Time);
      if (short2Time) await settingRepository.set('short_2_time', short2Time);
      if (llmProvider) await settingRepository.set('llm_provider', llmProvider);
      if (llmModel) await settingRepository.set('llm_model', llmModel);
      if (llmApiKey && llmApiKey.trim()) await settingRepository.setSecure('llm_api_key', llmApiKey.trim());
      if (ttsProvider) await settingRepository.set('tts_provider', ttsProvider);
      if (ttsVoice) await settingRepository.set('tts_voice', ttsVoice);
      if (ttsApiKey && ttsApiKey.trim()) await settingRepository.setSecure('tts_api_key', ttsApiKey.trim());
      await settingRepository.set('enable_background_music', enableBackgroundMusic === 'on' ? 'true' : 'false');

      res.redirect('/admin/settings?success=Settings+updated+successfully');
    } catch (err: any) {
      logger.error(`Error saving settings: ${err.message}`);
      res.redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
    }
  }
}


export const adminController = new AdminController();
