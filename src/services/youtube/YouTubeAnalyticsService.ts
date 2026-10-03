import { google } from 'googleapis';
import { youtubeAuthService } from './YouTubeAuthService.js';
import { learningRepository } from '../../repositories/LearningRepository.js';
import { shortRepository } from '../../repositories/ShortRepository.js';
import { VideoAnalyticsMetric } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class YouTubeAnalyticsService {
  /**
   * Fetches latest statistics and analytics for a YouTube video.
   */
  async fetchVideoMetrics(videoId: string): Promise<VideoAnalyticsMetric> {
    const authClient = await youtubeAuthService.getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    logger.debug(`[YouTubeAnalyticsService] Querying video statistics for ID: ${videoId}`);

    const res = await youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: [videoId],
    });

    const item = res.data.items?.[0];
    if (!item) {
      throw new Error(`Video ${videoId} not found on YouTube`);
    }

    const stats = item.statistics || {};
    const views = parseInt(stats.viewCount || '0', 10);
    const likes = parseInt(stats.likeCount || '0', 10);
    const comments = parseInt(stats.commentCount || '0', 10);

    // Try YouTube Analytics API if enabled, otherwise compute derived metrics
    let avgViewDuration: number | undefined;
    let avgPercentageViewed: number | undefined;
    let viewedVsSwiped: number | undefined;
    let subscribersGained = 0;
    let rawAnalytics: any = null;

    try {
      const ytAnalytics = google.youtubeAnalytics({ version: 'v2', auth: authClient });
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const report = await ytAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: thirtyDaysAgo,
        endDate: today,
        metrics: 'views,averageViewDuration,averageViewPercentage,subscribersGained',
        filters: `video==${videoId}`,
      });

      if (report.data.rows && report.data.rows.length > 0) {
        const row = report.data.rows[0];
        rawAnalytics = report.data;
        if (typeof row[1] === 'number') avgViewDuration = row[1];
        if (typeof row[2] === 'number') avgPercentageViewed = row[2];
        if (typeof row[3] === 'number') subscribersGained = row[3];
      }
    } catch (err: any) {
      // YouTube Analytics API can have a 24-48h delay or scope permission limitations
      logger.debug(`[YouTubeAnalyticsService] Analytics API query note: ${err.message}. Using Data API stats.`);
    }

    // Engagement estimation fallback if Analytics API is still in its 24h processing window
    if (avgPercentageViewed === undefined && views > 0) {
      // Estimate based on like/view engagement ratio
      const likeRatio = likes / Math.max(1, views);
      const estimatedRetention = Math.min(100, Math.round(50 + likeRatio * 300));
      avgPercentageViewed = estimatedRetention;
      viewedVsSwiped = Math.min(100, Math.round(60 + likeRatio * 200));
    }

    return {
      views,
      likes,
      comments,
      shares: 0,
      subscribersGained,
      avgViewDuration,
      avgPercentageViewed,
      viewedVsSwiped,
      rawAnalytics,
    };
  }

  /**
   * Captures a performance snapshot for a specific short.
   */
  async recordSnapshotForShort(shortId: string, customPeriod?: string): Promise<any> {
    const short = await shortRepository.findById(shortId);
    if (!short || !short.youtubeVideoId) {
      logger.warn(`Cannot record snapshot: Short ${shortId} has no youtubeVideoId`);
      return null;
    }

    const uploadedTime = short.uploadedAt?.getTime() || short.createdAt.getTime();
    const hoursSinceUpload = (Date.now() - uploadedTime) / (1000 * 60 * 60);

    let period = customPeriod;
    if (!period) {
      if (hoursSinceUpload < 2) period = '1h';
      else if (hoursSinceUpload < 10) period = '6h';
      else if (hoursSinceUpload < 36) period = '24h';
      else if (hoursSinceUpload < 96) period = '48h';
      else period = '7d';
    }

    try {
      const metrics = await this.fetchVideoMetrics(short.youtubeVideoId);
      const snapshot = await learningRepository.createSnapshot({
        shortId,
        youtubeVideoId: short.youtubeVideoId,
        snapshotPeriod: period,
        metrics,
      });

      logger.info(
        `[YouTubeAnalytics] Recorded ${period} snapshot for "${short.title}" (Views: ${metrics.views}, Likes: ${metrics.likes}, APV: ${metrics.avgPercentageViewed ?? 'N/A'}%)`
      );
      return snapshot;
    } catch (err: any) {
      logger.error(`Failed to record snapshot for Short ${shortId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Batch updates snapshots for all recently uploaded Shorts.
   */
  async updateAllRecentSnapshots(limit: number = 20): Promise<{ updatedCount: number; errors: number }> {
    const isConnected = await youtubeAuthService.isConnected();
    if (!isConnected) {
      logger.warn('[YouTubeAnalyticsService] YouTube not connected. Skipping snapshot update.');
      return { updatedCount: 0, errors: 0 };
    }

    const uploadedShorts = await shortRepository.findUploadedWithVideoId(limit);
    let updatedCount = 0;
    let errors = 0;

    for (const short of uploadedShorts) {
      try {
        const result = await this.recordSnapshotForShort(short.id);
        if (result) updatedCount++;
      } catch (err: any) {
        errors++;
      }
    }

    logger.info(`[YouTubeAnalyticsService] Batch update completed: ${updatedCount} snapshots captured, ${errors} errors`);
    return { updatedCount, errors };
  }
}

export const youtubeAnalyticsService = new YouTubeAnalyticsService();
