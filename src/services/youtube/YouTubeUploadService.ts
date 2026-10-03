import fs from 'fs';
import { google } from 'googleapis';
import { youtubeAuthService } from './YouTubeAuthService.js';
import { YouTubeUploadInput, YouTubeUploadResult } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class YouTubeUploadService {
  async uploadVideo(input: YouTubeUploadInput, jobId?: string): Promise<YouTubeUploadResult> {
    logger.job(jobId || 'sys', `Initiating YouTube upload for "${input.title}"`);

    if (!fs.existsSync(input.videoPath)) {
      throw new Error(`Video file does not exist at path: ${input.videoPath}`);
    }

    const authClient = await youtubeAuthService.getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    const privacyStatus = input.privacyStatus || config.youtube.privacyStatus || 'public';
    const isMadeForKids =
      input.madeForKids !== undefined
        ? input.madeForKids
        : (input.contentMode === 'nursery_rhymes' || config.youtubeAudienceMode === 'MADE_FOR_KIDS');

    const defaultCategoryId = isMadeForKids ? '27' : '28'; // 27 = Education, 28 = Science & Technology
    const categoryId = input.categoryId || defaultCategoryId;

    // Ensure tags fit the actual content mode
    const defaultTags = isMadeForKids
      ? ['NurseryRhymes', 'KidsSongs', 'Preschool', 'SingAlong', 'Shorts']
      : input.contentMode === 'cartoon'
        ? ['Cartoon', 'Animation', 'Shorts']
        : ['Shorts', 'AI', 'AITools'];
    const tags = Array.from(new Set([...input.tags, ...defaultTags]));

    try {
      const response = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          notifySubscribers: true,
          requestBody: {
            snippet: {
              title: input.title,
              description: input.description,
              tags,
              categoryId,
              defaultLanguage: 'en',
              defaultAudioLanguage: 'en',
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: isMadeForKids,
              embeddable: true,
            },
          },
          media: {
            body: fs.createReadStream(input.videoPath),
          },
        },
        {
          // Resumable upload uploadType
          params: {
            uploadType: 'resumable',
          },
        }
      );

      const videoId = response.data.id;
      if (!videoId) {
        throw new Error('YouTube API did not return a video ID');
      }

      const youtubeUrl = `https://youtube.com/shorts/${videoId}`;
      logger.job(jobId || 'sys', `YouTube upload completed successfully! URL: ${youtubeUrl}`);

      return {
        videoId,
        url: youtubeUrl,
        status: 'UPLOADED',
      };
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error?.message || err?.message || String(err);
      const isQuotaError =
        errorMessage.includes('quotaExceeded') ||
        errorMessage.includes('dailyLimitExceeded') ||
        err?.response?.status === 403;

      if (isQuotaError) {
        logger.error(`YouTube API quota exceeded: ${errorMessage}`, undefined, jobId);
        const quotaError: any = new Error(`YouTube API quota exceeded: ${errorMessage}`);
        quotaError.code = 'YOUTUBE_QUOTA_EXCEEDED';
        throw quotaError;
      }

      logger.error(`YouTube upload failed: ${errorMessage}`, undefined, jobId);
      throw err;
    }
  }
}

export const youtubeUploadService = new YouTubeUploadService();
