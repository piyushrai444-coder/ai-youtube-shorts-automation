import fs from 'fs';
import path from 'path';
import os from 'os';
import { GeneratedScript } from '../../types/index.js';
import { ttsService } from '../tts/TTSService.js';
import { visualService } from '../visual/VisualService.js';
import { SubtitleGenerator } from './SubtitleGenerator.js';
import { ffmpegService } from './FFmpegService.js';
import { VideoValidator } from './VideoValidator.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export interface RenderedVideoPackage {
  videoPath: string;
  thumbnailPath: string;
  audioPath: string;
  subtitlesPath: string;
  durationSeconds: number;
  tempDir: string;
}

export class VideoService {
  async produceShortVideo(script: GeneratedScript, jobId?: string): Promise<RenderedVideoPackage> {
    logger.job(jobId || 'sys', `Starting end-to-end video production for "${script.title}"`);
    const workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yt_short_build_'));

    try {
      // 1. Generate Voiceover
      const voiceover = await ttsService.generateVoiceover(script.fullScript, jobId);
      const audioPath = path.join(workDir, 'voiceover.mp3');
      await fs.promises.writeFile(audioPath, voiceover.audioBuffer);
      const totalDuration = voiceover.durationSeconds;

      // 2. Generate Captions (.srt)
      const subtitlesPath = path.join(workDir, 'captions.srt');
      await SubtitleGenerator.writeSrtFile(script.fullScript, totalDuration, subtitlesPath);

      // 3. Generate Visual Scenes
      const { sceneImages, tempDir: sceneTempDir } = await visualService.generateScenes(
        script,
        totalDuration,
        jobId
      );

      // Thumbnail is the first hook visual
      const thumbnailPath = path.join(workDir, 'thumbnail.png');
      if (sceneImages.length > 0 && fs.existsSync(sceneImages[0].imagePath)) {
        await fs.promises.copyFile(sceneImages[0].imagePath, thumbnailPath);
      }

      // 4. Background Music (optional)
      const musicPath = path.resolve(process.cwd(), 'public/audio/ambient_tech.mp3');
      const enableMusic = config.branding.enableBackgroundMusic;

      // 5. Render Video via FFmpeg
      const outputVideoPath = path.join(workDir, 'short_final.mp4');
      await ffmpegService.renderVideo(
        {
          sceneImages,
          voiceoverAudioPath: audioPath,
          subtitlesPath,
          backgroundMusicPath: musicPath,
          enableMusic,
          outputPath: outputVideoPath,
          totalDuration,
        },
        jobId
      );

      // 6. Validate Video: 9:16, <= 30 seconds, H.264
      const validation = await VideoValidator.validateShort(outputVideoPath, jobId);
      if (!validation.isValid) {
        throw new Error(`Video validation failed: ${validation.error}`);
      }

      // Cleanup scene temp files
      try {
        await fs.promises.rm(sceneTempDir, { recursive: true, force: true });
      } catch {}

      logger.job(jobId || 'sys', `Video rendered and validated successfully: ${outputVideoPath} (${totalDuration.toFixed(2)}s)`);

      return {
        videoPath: outputVideoPath,
        thumbnailPath,
        audioPath,
        subtitlesPath,
        durationSeconds: totalDuration,
        tempDir: workDir,
      };
    } catch (err: any) {
      logger.error(`Video production failed: ${err.message}`, undefined, jobId);
      // Clean up on failure
      try {
        await fs.promises.rm(workDir, { recursive: true, force: true });
      } catch {}
      throw err;
    }
  }

  async cleanupWorkDir(workDir: string): Promise<void> {
    try {
      if (fs.existsSync(workDir)) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
      }
    } catch (err: any) {
      logger.warn(`Could not delete temp work dir ${workDir}: ${err.message}`);
    }
  }
}

export const videoService = new VideoService();
