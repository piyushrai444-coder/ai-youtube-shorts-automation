import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Initialize ffmpeg and ffprobe paths
try {
  if (config.ffmpeg.ffmpegPath && fs.existsSync(config.ffmpeg.ffmpegPath)) {
    ffmpeg.setFfmpegPath(config.ffmpeg.ffmpegPath);
  } else {
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      if (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
      }
    } catch {}
  }

  if (config.ffmpeg.ffprobePath && fs.existsSync(config.ffmpeg.ffprobePath)) {
    ffmpeg.setFfprobePath(config.ffmpeg.ffprobePath);
  } else {
    try {
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
      if (ffprobeInstaller?.path && fs.existsSync(ffprobeInstaller.path)) {
        ffmpeg.setFfprobePath(ffprobeInstaller.path);
      }
    } catch {}
  }
} catch (err: any) {
  logger.warn(`Could not set @ffmpeg-installer paths automatically: ${err.message}`);
}

export interface RenderShortOptions {
  sceneImages: { imagePath: string; duration: number }[];
  voiceoverAudioPath?: string;
  subtitlesPath?: string;
  backgroundMusicPath?: string;
  enableMusic?: boolean;
  outputPath: string;
  totalDuration: number;
  aspectRatio?: '9:16' | '16:9';
  audioMode?: 'instrumental' | 'voiceover' | 'both';
  burnSubtitles?: boolean;
}

export class FFmpegService {
  async getMediaDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.warn(`ffprobe failed on ${filePath}: ${err.message}`);
          return resolve(0);
        }
        const duration = metadata.format.duration || 0;
        resolve(duration);
      });
    });
  }

  async getMediaMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });
  }

  async adjustAudioSpeed(inputPath: string, outputPath: string, factor: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // atempo filter is clamped between 0.5 and 2.0
      const clampedFactor = Math.max(0.5, Math.min(2.0, factor));
      ffmpeg(inputPath)
        .audioFilters(`atempo=${clampedFactor.toFixed(3)}`)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  async renderVideo(options: RenderShortOptions, jobId?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      logger.job(jobId || 'sys', `Starting FFmpeg 9:16 vertical render for ${options.totalDuration.toFixed(2)}s video...`);

      // 1. Create concat file for scene images
      const tmpDir = path.dirname(options.outputPath);
      const concatListPath = path.join(tmpDir, `concat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
      
      let concatContent = '';
      for (const scene of options.sceneImages) {
        // Concat demuxer format:
        // file 'path'
        // duration 5.2
        concatContent += `file '${scene.imagePath.replace(/'/g, "'\\''")}'\n`;
        concatContent += `duration ${scene.duration.toFixed(3)}\n`;
      }
      // Concat demuxer requires repeating the last file without duration
      if (options.sceneImages.length > 0) {
        concatContent += `file '${options.sceneImages[options.sceneImages.length - 1].imagePath.replace(/'/g, "'\\''")}'\n`;
      }
      await fs.promises.writeFile(concatListPath, concatContent);

      const command = ffmpeg();

      // Input 0: Image Concat List
      command.input(concatListPath).inputOptions(['-f concat', '-safe 0']);

      const hasVoiceover = Boolean(
        options.voiceoverAudioPath &&
        options.audioMode !== 'instrumental' &&
        fs.existsSync(options.voiceoverAudioPath)
      );

      const hasMusic = Boolean(
        options.backgroundMusicPath &&
        fs.existsSync(options.backgroundMusicPath) &&
        (options.enableMusic !== false || options.audioMode === 'instrumental')
      );

      if (hasVoiceover) {
        // Input 1: Voiceover Audio
        command.input(options.voiceoverAudioPath!);
        if (hasMusic) {
          // Input 2: Background Music (looped)
          command.input(options.backgroundMusicPath!).inputOptions(['-stream_loop -1']);
        }
      } else if (hasMusic) {
        // Instrumental Only Mode: Input 1 is Background Music (looped)
        command.input(options.backgroundMusicPath!).inputOptions(['-stream_loop -1']);
      }

      // Filter graph setup:
      // Video: scale/crop to exactly 1080x1920 (9:16), set 30fps
      const isLandscape = options.aspectRatio === '16:9';
      const targetWidth = isLandscape ? 1920 : 1080;
      const targetHeight = isLandscape ? 1080 : 1920;
      const marginV = isLandscape ? 60 : 360;

      const videoFilters: string[] = [
        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
        `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
        'fps=30',
        `zoompan=z='if(lte(mod(on,120),60),zoom+0.0008,zoom-0.0008)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${targetWidth}x${targetHeight}:fps=30`,
        'format=yuv420p',
      ];

      // Burn subtitles directly if explicitly requested and file exists
      if (options.burnSubtitles && options.subtitlesPath && fs.existsSync(options.subtitlesPath)) {
        const escapedSubPath = options.subtitlesPath
          .replace(/\\/g, '/')
          .replace(/:/g, '\\:');
        videoFilters.push(`subtitles='${escapedSubPath}':force_style='FontName=Arial,FontSize=24,Bold=1,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=3,Shadow=2,Alignment=2,MarginV=${marginV}'`);
      }

      command.videoFilters(videoFilters);

      // Audio Filter & Mapping
      const fadeOutStart = Math.max(0, options.totalDuration - 1.5).toFixed(2);

      if (hasVoiceover && hasMusic) {
        const audioFilter = `[1:a]volume=1.0[v_audio];[2:a]volume=0.10,afade=t=out:st=${fadeOutStart}:d=1.5[m_audio];[v_audio][m_audio]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[out_audio]`;
        command.complexFilter([audioFilter]).outputOptions(['-map 0:v', '-map [out_audio]']);
      } else if (hasVoiceover) {
        command.outputOptions(['-map 0:v', '-map 1:a']);
      } else if (hasMusic) {
        // Pure instrumental music with smooth fade-in and fade-out
        const audioFilter = `[1:a]volume=0.90,afade=t=in:ss=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=1.5[out_audio]`;
        command.complexFilter([audioFilter]).outputOptions(['-map 0:v', '-map [out_audio]']);
      } else {
        command.outputOptions(['-map 0:v']);
      }

      command
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('192k')
        .outputOptions([
          '-preset veryfast',
          '-crf 22',
          `-t ${options.totalDuration.toFixed(2)}`, // Hard limit duration to match exact voiceover
          '-movflags +faststart',
        ])
        .output(options.outputPath);

      command.on('start', (cmdline) => {
        logger.debug(`FFmpeg command: ${cmdline}`);
      });

      command.on('progress', (progress) => {
        if (progress.percent) {
          logger.debug(`FFmpeg progress: ${Math.round(progress.percent)}%`);
        }
      });

      command.on('end', async () => {
        logger.job(jobId || 'sys', 'FFmpeg video rendering finished successfully');
        try {
          await fs.promises.unlink(concatListPath);
        } catch {}
        resolve(options.outputPath);
      });

      command.on('error', async (err, stdout, stderr) => {
        logger.error(`FFmpeg render failed: ${err.message}\nStderr: ${stderr}`, undefined, jobId);
        try {
          await fs.promises.unlink(concatListPath);
        } catch {}
        reject(err);
      });

      command.run();
    });
  }
}

export const ffmpegService = new FFmpegService();
