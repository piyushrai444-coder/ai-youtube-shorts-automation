import fs from 'fs';
import path from 'path';
import os from 'os';
import { EdgeTTSProvider } from '../tts/EdgeTTSProvider.js';
import { ffmpegService } from '../video/FFmpegService.js';
import { CartoonScript, StoryboardSceneItem, SubtitleItem } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface CartoonAudioResult {
  audioPath: string;
  subtitlesPath: string;
  totalDurationSeconds: number;
  sceneTimings: { sceneIndex: number; startTime: number; duration: number }[];
}

export class CartoonAudioService {
  private ttsProvider = new EdgeTTSProvider();

  /**
   * Generates multi-character voice acting, accurate mobile subtitle timestamps,
   * and concatenates scene speech into a unified 30-45 second track.
   */
  async produceCartoonAudio(script: CartoonScript, jobId?: string): Promise<CartoonAudioResult> {
    logger.job(jobId || 'cartoon', `Producing multi-character voice acting for ${script.scenes.length} scenes...`);

    const tmpDir = os.tmpdir();
    const tempSceneFiles: { path: string; duration: number; scene: StoryboardSceneItem }[] = [];
    const subtitles: SubtitleItem[] = [];
    let cumulativeTime = 0.0;
    const sceneTimings: { sceneIndex: number; startTime: number; duration: number }[] = [];

    // Map character name to voice persona
    const voiceMap = new Map<string, string>();
    for (const char of script.characters) {
      voiceMap.set(char.name.toLowerCase(), char.voicePersona || 'en-US-AnaNeural');
    }

    // 1. Synthesize dialogue for each scene
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const speakerVoice =
        voiceMap.get(scene.characterName.toLowerCase()) ||
        this.getDefaultVoiceForCharacter(scene.characterName);

      const dialogueText = (scene.dialogue || '').trim();
      const sceneAudioPath = path.join(tmpDir, `scene_${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

      if (dialogueText.length > 0) {
        try {
          const res = await this.ttsProvider.generateSpeech(dialogueText, speakerVoice);
          await fs.promises.writeFile(sceneAudioPath, res.audioBuffer);

          let duration = await ffmpegService.getMediaDuration(sceneAudioPath);
          if (!duration || duration <= 0) {
            duration = res.durationSeconds;
          }

          // Add a tiny natural pause (0.4s) after scene speech
          duration = Math.max(1.5, duration + 0.4);

          tempSceneFiles.push({ path: sceneAudioPath, duration, scene });

          // Subtitle item
          const startTimeMs = Math.round(cumulativeTime * 1000);
          const endTimeMs = Math.round((cumulativeTime + Math.max(1.0, duration - 0.3)) * 1000);
          subtitles.push({
            index: i + 1,
            startTime: this.formatSrtTimestamp(startTimeMs),
            endTime: this.formatSrtTimestamp(endTimeMs),
            text: `${scene.characterName}: ${dialogueText}`,
            rawStartSec: cumulativeTime,
            rawEndSec: cumulativeTime + duration,
          });

          sceneTimings.push({
            sceneIndex: scene.sceneNumber,
            startTime: cumulativeTime,
            duration,
          });

          cumulativeTime += duration;
        } catch (err: any) {
          logger.warn(`[CartoonAudioService] Failed synthesizing scene ${i + 1}: ${err.message}. Using silent spacer.`);
          const placeholderDuration = scene.durationSeconds || 4;
          sceneTimings.push({
            sceneIndex: scene.sceneNumber,
            startTime: cumulativeTime,
            duration: placeholderDuration,
          });
          cumulativeTime += placeholderDuration;
        }
      } else {
        const silentDuration = scene.durationSeconds || 3;
        sceneTimings.push({
          sceneIndex: scene.sceneNumber,
          startTime: cumulativeTime,
          duration: silentDuration,
        });
        cumulativeTime += silentDuration;
      }
    }

    // 2. Concatenate audio files using FFmpeg concat demuxer
    const combinedAudioPath = path.join(tmpDir, `cartoon_voiceover_${Date.now()}.mp3`);
    if (tempSceneFiles.length > 0) {
      const concatTxtPath = path.join(tmpDir, `audio_concat_${Date.now()}.txt`);
      const concatContent = tempSceneFiles.map((f) => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');
      await fs.promises.writeFile(concatTxtPath, concatContent);

      await new Promise<void>((resolve, reject) => {
        import('fluent-ffmpeg').then(({ default: ffmpeg }) => {
          ffmpeg()
            .input(concatTxtPath)
            .inputOptions(['-f concat', '-safe 0'])
            .audioCodec('libmp3lame')
            .audioBitrate('192k')
            .output(combinedAudioPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
        });
      });

      try {
        await fs.promises.unlink(concatTxtPath);
        for (const f of tempSceneFiles) {
          await fs.promises.unlink(f.path).catch(() => {});
        }
      } catch {}
    } else {
      // Empty fallback audio generator if needed
      await fs.promises.writeFile(combinedAudioPath, Buffer.alloc(100));
    }

    // 3. Check duration constraint (30 - 45s)
    let finalDuration = await ffmpegService.getMediaDuration(combinedAudioPath);
    if (!finalDuration || finalDuration <= 0) {
      finalDuration = cumulativeTime;
    }

    logger.job(jobId || 'cartoon', `Cartoon voiceover raw duration: ${finalDuration.toFixed(2)}s`);

    const minDur = config.cartoon.minDurationSeconds || 30;
    const maxDur = config.cartoon.maxDurationSeconds || 45;
    const targetDur = config.cartoon.targetDurationSeconds || 38;

    if (finalDuration > maxDur || (finalDuration < minDur && finalDuration > 5)) {
      const factor = finalDuration / targetDur;
      logger.job(
        jobId || 'cartoon',
        `Duration (${finalDuration.toFixed(2)}s) out of bounds [${minDur}-${maxDur}s]. Adjusting speed by factor ${factor.toFixed(2)}...`
      );
      const adjustedPath = path.join(tmpDir, `cartoon_voiceover_adj_${Date.now()}.mp3`);
      try {
        await ffmpegService.adjustAudioSpeed(combinedAudioPath, adjustedPath, factor);
        finalDuration = await ffmpegService.getMediaDuration(adjustedPath);
        await fs.promises.unlink(combinedAudioPath).catch(() => {});
        return this.finishAudioBundle(adjustedPath, subtitles, finalDuration, sceneTimings, tmpDir);
      } catch (err: any) {
        logger.warn(`Could not adjust audio speed: ${err.message}. Proceeding with raw audio.`);
      }
    }

    return this.finishAudioBundle(combinedAudioPath, subtitles, finalDuration, sceneTimings, tmpDir);
  }

  private async finishAudioBundle(
    audioPath: string,
    subtitles: SubtitleItem[],
    totalDuration: number,
    sceneTimings: { sceneIndex: number; startTime: number; duration: number }[],
    tmpDir: string
  ): Promise<CartoonAudioResult> {
    const srtContent = subtitles
      .map((s) => `${s.index}\n${s.startTime} --> ${s.endTime}\n${s.text}\n`)
      .join('\n');

    const subtitlesPath = path.join(tmpDir, `cartoon_subtitles_${Date.now()}.srt`);
    await fs.promises.writeFile(subtitlesPath, srtContent);

    return {
      audioPath,
      subtitlesPath,
      totalDurationSeconds: totalDuration,
      sceneTimings,
    };
  }

  private getDefaultVoiceForCharacter(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('milo')) return 'en-US-AnaNeural';
    if (n.includes('luna')) return 'en-US-JennyNeural';
    if (n.includes('barnaby')) return 'en-US-GuyNeural';
    if (n.includes('pip')) return 'en-US-AriaNeural';
    return 'en-US-ChristopherNeural';
  }

  private formatSrtTimestamp(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }
}

export const cartoonAudioService = new CartoonAudioService();
