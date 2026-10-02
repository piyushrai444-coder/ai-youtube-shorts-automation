import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { storageService } from '../services/storage/StorageService.js';
import { config } from '../config/index.js';

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    const dbHealth = await checkDatabaseConnection();
    const isYouTubeConnected = await youtubeService.auth.isConnected();

    const isHealthy = dbHealth.ok;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      timezone: config.cron.timezone,
      services: {
        database: dbHealth.ok ? 'connected' : 'disconnected',
        storage: storageService.getProviderName(),
        youtube: isYouTubeConnected ? 'connected' : 'unlinked',
      },
      schedule: {
        short1: config.cron.short1Time,
        short2: config.cron.short2Time,
      },
    });
  }
}

export const healthController = new HealthController();
