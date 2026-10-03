import fs from 'fs';
import path from 'path';
import os from 'os';
import { ShortStatus, JobStatus } from '@prisma/client';
import { cartoonResearchService } from '../services/cartoon/CartoonResearchService.js';
import { cartoonScriptGenerator } from '../services/cartoon/CartoonScriptGenerator.js';
import { cartoonVisualService } from '../services/cartoon/CartoonVisualService.js';
import { cartoonAudioService } from '../services/cartoon/CartoonAudioService.js';
import { cartoonQualityGate } from '../services/cartoon/CartoonQualityGate.js';
import { ffmpegService } from '../services/video/FFmpegService.js';
import { storageService } from '../services/storage/StorageService.js';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { storyRepository } from '../repositories/StoryRepository.js';
import { characterRepository } from '../repositories/CharacterRepository.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { characterManager } from '../services/cartoon/CharacterManager.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { PipelineOptions } from './AutomationPipeline.js';

export class CartoonPipeline {
  async execute(options: PipelineOptions): Promise<void> {
    const { jobId, slotKey } = options;
    logger.job(jobId, `🎬 Starting Autonomous Cartoon Shorts Pipeline for slot: ${slotKey}`);

    await jobRepository.update(jobId, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
    });

    let currentShortId = options.shortId;
    let workDir: string | null = null;

    try {
      // 1. Fetch or create the Short record
      let shortRecord = currentShortId
        ? await shortRepository.findById(currentShortId)
        : await shortRepository.findBySlotKey(slotKey);

      if (!shortRecord) {
        shortRecord = await shortRepository.create({
          slotKey,
          title: 'Generating Cartoon Short...',
          script: '',
          description: '',
          category: 'Cartoon Animation',
          status: ShortStatus.RESEARCHING,
          scheduledAt: new Date(),
        });
      }
      currentShortId = shortRecord.id;
      await jobRepository.update(jobId, { shortId: currentShortId });

      // Mark content mode on short
      await shortRepository.update(currentShortId, {
        contentMode: 'cartoon',
      });

      // 2. Step 1: Cartoon Trend Research & Story Idea Generation
      logger.job(jobId, 'Step 1/7: Brainstorming & scoring viral cartoon story concepts...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.RESEARCHING);
      const winningStory = await cartoonResearchService.discoverBestStory(jobId);

      // 3. Step 2: Character Cast & Scriptwriting (30-45 seconds pacing)
      logger.job(jobId, 'Step 2/7: Generating 30-45s multi-scene storyboard & dialogue...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.SCRIPT_GENERATED);
      const script = await cartoonScriptGenerator.generateCartoonScript(winningStory, jobId);

      // Ensure default cast is seeded and find DB character IDs
      await characterManager.ensureSeeded();
      const characterMapByName = new Map<string, string>();
      const characterIds: string[] = [];
      for (const char of script.characters) {
        const dbChar = await characterRepository.findByName(char.name);
        if (dbChar) {
          characterMapByName.set(char.name, dbChar.id);
          characterIds.push(dbChar.id);
        }
      }

      // Persist Storyboard & Scenes in DB
      let storyIdeaRecord = await storyRepository.createStoryIdea({
        ...winningStory,
        status: 'PRODUCED',
      });

      await storyRepository.createStoryboardWithScenes(
        storyIdeaRecord.id,
        script.targetDurationSeconds,
        script.scenes,
        characterMapByName
      );

      // Link story idea to Short
      await shortRepository.update(currentShortId, {
        title: script.title,
        script: script.scenes.map((s) => `${s.characterName}: ${s.dialogue}`).join('\n'),
        description: script.description,
        tags: Array.isArray(script.tags) ? script.tags.join(',') : script.tags,
        storyIdea: { connect: { id: storyIdeaRecord.id } },
        characterIds,
      });

      // Prepare temporary workspace for media rendering
      workDir = path.join(os.tmpdir(), `cartoon_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      await fs.promises.mkdir(workDir, { recursive: true });

      // 4. Step 3: Render 1080x1920 9:16 Cartoon Visual Scenes
      logger.job(jobId, 'Step 3/7: Generating 9:16 cartoon visual frames for all scenes...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.VIDEO_GENERATING);
      const visualResults = await cartoonVisualService.generateCartoonScenes(script.scenes, script.title);

      const sceneImageFiles: { imagePath: string; duration: number }[] = [];
      for (const vRes of visualResults) {
        const sceneImagePath = path.join(workDir, `scene_${vRes.sceneIndex}.png`);
        await fs.promises.writeFile(sceneImagePath, vRes.imageBuffer);
        sceneImageFiles.push({
          imagePath: sceneImagePath,
          duration: vRes.durationSeconds,
        });
      }

      // 5. Step 4: Multi-Character Voice Acting & Mobile Captions
      logger.job(jobId, 'Step 4/7: Performing multi-character voice acting & generating captions...');
      const audioBundle = await cartoonAudioService.produceCartoonAudio(script, jobId);

      // Sync scene durations with measured audio duration
      const totalAudioDur = audioBundle.totalDurationSeconds;
      const durationPerScene = totalAudioDur / Math.max(sceneImageFiles.length, 1);
      const syncedSceneImages = sceneImageFiles.map((sc) => ({
        ...sc,
        duration: durationPerScene,
      }));

      // 6. Step 5: FFmpeg Video Assembly
      logger.job(jobId, 'Step 5/7: Assembling and rendering final 1080x1920 cartoon Short...');
      const renderedVideoPath = path.join(workDir, `rendered_cartoon_${Date.now()}.mp4`);
      await ffmpegService.renderVideo(
        {
          sceneImages: syncedSceneImages,
          voiceoverAudioPath: audioBundle.audioPath,
          subtitlesPath: audioBundle.subtitlesPath,
          enableMusic: false,
          outputPath: renderedVideoPath,
          totalDuration: totalAudioDur,
        },
        jobId
      );

      // 7. Step 6: AI Quality Gate (Strict 30-45s, originality, safe zones)
      logger.job(jobId, 'Step 6/7: Running AI Quality Gate checks...');
      const qualityCheck = await cartoonQualityGate.validateCartoonShort(renderedVideoPath, script, jobId);
      if (!qualityCheck.passed) {
        throw new Error(`AI Quality Gate failed: ${qualityCheck.issues.join('; ')}`);
      }

      // Upload video to storage
      const videoBuffer = await fs.promises.readFile(renderedVideoPath);
      const storedVideo = await storageService.uploadVideo(videoBuffer, currentShortId, jobId);

      await shortRepository.update(currentShortId, {
        videoUrl: storedVideo.url,
        durationSeconds: qualityCheck.durationSeconds,
        status: ShortStatus.VIDEO_READY,
      });


      // 8. Step 7: YouTube Publishing
      logger.job(jobId, 'Step 7/7: Checking YouTube connection and publishing Short...');
      const isConnected = await youtubeService.auth.isConnected();
      if (!isConnected) {
        logger.warn('YouTube not connected via OAuth. Short saved and marked UPLOAD_PENDING.', undefined, jobId);
        await shortRepository.update(currentShortId, {
          status: ShortStatus.UPLOAD_PENDING,
          errorMessage: 'YouTube account not connected. Please authorize YouTube in Admin settings.',
        });
        await jobRepository.update(jobId, {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          metadata: JSON.stringify({ note: 'Cartoon video rendered, waiting for YouTube OAuth' }),
        });
        return;
      }

      await shortRepository.updateStatus(currentShortId, ShortStatus.UPLOADING);
      const youtubeResult = await youtubeService.upload.uploadVideo(
        {
          videoPath: renderedVideoPath,
          title: script.title,
          description: script.description,
          tags: script.tags,
          privacyStatus: config.youtube.privacyStatus,
        },
        jobId
      );

      // Increment appearance counts for characters
      for (const charId of characterIds) {
        await characterRepository.incrementAppearance(charId).catch(() => {});
      }

      // Mark complete
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
          mode: 'cartoon',
        }),
      });

      logger.job(jobId, `🎉 Cartoon Shorts Pipeline succeeded! Video is LIVE: ${youtubeResult.url}`);
    } catch (err: any) {
      logger.error(`Cartoon Pipeline failure: ${err.message}`, undefined, jobId);
      if (currentShortId) {
        await shortRepository.update(currentShortId, {
          status: ShortStatus.FAILED,
          errorMessage: err.message,
        }).catch(() => {});
      }
      await jobRepository.update(jobId, {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: err.message,
      }).catch(() => {});
      throw err;
    } finally {
      if (workDir) {
        try {
          await fs.promises.rm(workDir, { recursive: true, force: true });
        } catch {}
      }
    }
  }
}

export const cartoonPipeline = new CartoonPipeline();
