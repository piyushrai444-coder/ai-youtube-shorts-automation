import fs from 'fs';
import { ShortStatus, JobStatus } from '@prisma/client';
import { researchService } from '../services/research/ResearchService.js';
import { aiService } from '../services/ai/AIService.js';
import { videoService } from '../services/video/VideoService.js';
import { storageService } from '../services/storage/StorageService.js';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { topicRepository } from '../repositories/TopicRepository.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface PipelineOptions {
  jobId: string;
  slotKey: string;
  jobType: string;
  category?: string;
  shortId?: string; // If retrying an existing short
}

export class AutomationPipeline {
  async execute(options: PipelineOptions): Promise<void> {
    const { jobId, slotKey, jobType, category } = options;
    logger.job(jobId, `Starting AI YouTube Shorts Automation Pipeline for slot: ${slotKey}`);

    // Update job to RUNNING
    await jobRepository.update(jobId, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
    });

    let currentShortId = options.shortId;
    let workDirToClean: string | null = null;

    try {
      // 1. Check if Short already exists (e.g. retry) or create a new Short record
      let shortRecord = currentShortId
        ? await shortRepository.findById(currentShortId)
        : await shortRepository.findBySlotKey(slotKey);

      if (!shortRecord) {
        shortRecord = await shortRepository.create({
          slotKey,
          title: 'Generating Short...',
          script: '',
          description: '',
          category: category || 'AI Tools',
          status: ShortStatus.RESEARCHING,
          scheduledAt: new Date(),
        });
      }
      currentShortId = shortRecord.id;
      await jobRepository.update(jobId, { shortId: currentShortId });

      // If already uploaded, do not re-run (idempotency safety)
      if (shortRecord.status === ShortStatus.UPLOADED && shortRecord.youtubeVideoId) {
        logger.job(jobId, `Short ${currentShortId} is already marked as UPLOADED. Skipping pipeline.`);
        await jobRepository.update(jobId, {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        });
        return;
      }

      // Step 1: Research Fresh AI Topics
      logger.job(jobId, 'Step 1/8: Researching fresh AI topics...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.RESEARCHING);
      const candidateTopics = await researchService.discoverTopics(undefined, category, jobId);

      if (candidateTopics.length === 0) {
        throw new Error('Research yielded zero topics. Please verify research sources or internet connectivity.');
      }

      // Step 2: Select Best Topic
      logger.job(jobId, `Step 2/8: Selecting best topic from ${candidateTopics.length} candidates...`);
      const selectedTopic = await aiService.selectBestTopic(candidateTopics, jobId);
      logger.job(jobId, `Selected topic: "${selectedTopic.title}" from ${selectedTopic.source}`);

      // Find or create topic in DB to link
      let dbTopic = await topicRepository.findByHash(selectedTopic.contentHash);
      if (!dbTopic) {
        dbTopic = await topicRepository.create(selectedTopic);
      }
      await topicRepository.markUsed(dbTopic.id);

      await shortRepository.update(currentShortId, {
        topic: { connect: { id: dbTopic.id } },
        category: selectedTopic.category,
        status: ShortStatus.TOPIC_SELECTED,
      });

      // Step 3: Generate & Validate Script (strict <= 30s)
      logger.job(jobId, 'Step 3/8: Generating high-retention script with AI...');
      const script = await aiService.generateAndValidateScript(
        {
          topicTitle: selectedTopic.title,
          summary: selectedTopic.summary,
          sourceUrl: selectedTopic.sourceUrl,
          source: selectedTopic.source,
          category: selectedTopic.category,
          channelName: config.branding.channelName,
          defaultCta: config.branding.defaultCta,
        },
        jobId
      );

      await shortRepository.update(currentShortId, {
        title: script.title,
        script: script.fullScript,
        description: script.description,
        tags: script.tags.join(','),
        status: ShortStatus.SCRIPT_GENERATED,
      });

      // Step 4 & 5 & 6: Produce Video (TTS Voiceover, Visuals, Captions, FFmpeg 9:16 Render)
      logger.job(jobId, 'Step 4/8: Generating voiceover, visuals, captions & rendering video via FFmpeg...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.VIDEO_GENERATING);

      const videoPackage = await videoService.produceShortVideo(script, jobId);
      workDirToClean = videoPackage.tempDir;

      await shortRepository.update(currentShortId, {
        durationSeconds: videoPackage.durationSeconds,
        status: ShortStatus.VIDEO_READY,
      });

      // Step 7: Upload Media to Permanent Object Storage
      logger.job(jobId, 'Step 5/8: Uploading media package to object storage...');
      const videoBuffer = await fs.promises.readFile(videoPackage.videoPath);
      const thumbnailBuffer = await fs.promises.readFile(videoPackage.thumbnailPath);
      const audioBuffer = await fs.promises.readFile(videoPackage.audioPath);
      const captionsBuffer = await fs.promises.readFile(videoPackage.subtitlesPath);

      const [storedVideo, storedThumbnail, storedAudio, storedCaptions] = await Promise.all([
        storageService.uploadVideo(videoBuffer, currentShortId, jobId),
        storageService.uploadThumbnail(thumbnailBuffer, currentShortId, jobId),
        storageService.uploadAudio(audioBuffer, currentShortId, jobId),
        storageService.uploadCaptions(captionsBuffer, currentShortId, jobId),
      ]);

      await shortRepository.update(currentShortId, {
        videoUrl: storedVideo.url,
        thumbnailUrl: storedThumbnail.url,
        audioUrl: storedAudio.url,
        captionsUrl: storedCaptions.url,
        status: ShortStatus.UPLOAD_PENDING,
      });

      // Step 8: Upload to YouTube Data API v3
      logger.job(jobId, 'Step 6/8: Checking YouTube connection and publishing Short...');
      const isYouTubeConnected = await youtubeService.auth.isConnected();

      if (!isYouTubeConnected) {
        logger.warn(
          'YouTube is not yet connected via OAuth. Video is saved in storage and marked UPLOAD_PENDING.',
          undefined,
          jobId
        );
        await shortRepository.update(currentShortId, {
          status: ShortStatus.UPLOAD_PENDING,
          errorMessage: 'YouTube account not connected. Please authorize YouTube in Admin settings.',
        });
        await jobRepository.update(jobId, {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          metadata: JSON.stringify({ note: 'Video ready, waiting for YouTube OAuth connection' }),
        });
        return;
      }

      await shortRepository.updateStatus(currentShortId, ShortStatus.UPLOADING);

      const youtubeResult = await youtubeService.upload.uploadVideo(
        {
          videoPath: videoPackage.videoPath,
          title: script.title,
          description: script.description,
          tags: script.tags,
          privacyStatus: config.youtube.privacyStatus,
        },
        jobId
      );

      // Successfully Uploaded!
      await shortRepository.update(currentShortId, {
        youtubeVideoId: youtubeResult.videoId,
        youtubeUrl: youtubeResult.url,
        status: ShortStatus.UPLOADED,
        uploadedAt: new Date(),
        errorMessage: null,
      });

      await jobRepository.update(jobId, {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        metadata: JSON.stringify({
          youtubeVideoId: youtubeResult.videoId,
          youtubeUrl: youtubeResult.url,
        }),
      });

      logger.job(jobId, `🎉 Pipeline completed successfully! Short is LIVE: ${youtubeResult.url}`);
    } catch (err: any) {
      logger.error(`Pipeline failure: ${err.message}`, undefined, jobId);

      const isQuotaError = err?.code === 'YOUTUBE_QUOTA_EXCEEDED';
      const newStatus = isQuotaError ? ShortStatus.UPLOAD_PENDING : ShortStatus.FAILED;

      if (currentShortId) {
        await shortRepository.update(currentShortId, {
          status: newStatus,
          errorMessage: err.message,
          retryCount: { increment: 1 },
        });
      }

      // Schedule retry with exponential backoff if retryable
      const currentJob = await jobRepository.findById(jobId);
      const retryCount = (currentJob?.retryCount || 0) + 1;
      const isRetryable = retryCount <= 3 && !err.message.includes('Invalid API key') && !err.message.includes('not configured');

      let nextRetryAt: Date | null = null;
      if (isRetryable) {
        // Backoff: 1 min, 5 min, 15 min
        const backoffMinutes = retryCount === 1 ? 1 : retryCount === 2 ? 5 : 15;
        nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        logger.job(jobId, `Job scheduled for retry #${retryCount} at ${nextRetryAt.toISOString()}`);
      }

      await jobRepository.update(jobId, {
        status: JobStatus.FAILED,
        errorMessage: err.message,
        retryCount,
        nextRetryAt,
        completedAt: new Date(),
      });

      throw err;
    } finally {
      // Clean up temporary local render directory
      if (workDirToClean) {
        await videoService.cleanupWorkDir(workDirToClean);
      }
    }
  }
}

export const automationPipeline = new AutomationPipeline();
