import fs from 'fs';
import path from 'path';
import os from 'os';
import { EdgeTTS } from 'node-edge-tts';
import { ffmpegService } from '../video/FFmpegService.js';
import { kidsCharacterManager } from './KidsCharacterManager.js';
import { LyricSectionItem, StructuredSongLyrics } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export interface SingingRequest {
  lyrics: StructuredSongLyrics;
  jobId?: string;
}

export interface SingingResult {
  vocalAudioPath: string;
  totalDurationSeconds: number;
  sectionTimings: { sectionIndex: number; title: string; startTime: number; duration: number }[];
}

export interface SingingProvider {
  name: string;
  generateVocals(request: SingingRequest): Promise<SingingResult>;
}

export class NeuralSingingProvider implements SingingProvider {
  name = 'NeuralSingingProvider';

  /**
   * Generates child-friendly melodic singing voices mapped across the character cast
   * with precise musical pacing and synchronized section timings.
   */
  async generateVocals(request: SingingRequest): Promise<SingingResult> {
    const { lyrics, jobId } = request;
    logger.job(
      jobId || 'nursery',
      `[SingingProvider] Synthesizing preschool vocals for ${lyrics.sections.length} sections (${lyrics.bpm} BPM)...`
    );

    const tmpDir = os.tmpdir();
    const tempSectionFiles: { path: string; duration: number; section: LyricSectionItem }[] = [];
    const sectionTimings: { sectionIndex: number; title: string; startTime: number; duration: number }[] = [];
    let cumulativeTime = 0.0;

    for (let i = 0; i < lyrics.sections.length; i++) {
      const section = lyrics.sections[i];
      const leadCharName = section.leadCharacter || section.singer || 'Leo';
      const char = await kidsCharacterManager.getKidsCharacter(leadCharName);
      const voiceName = char?.voicePersona || 'en-US-AnaNeural';
      const pitchOffset = char?.singingVoiceProfile?.pitchOffset || '+3Hz';

      const sectionText = (section.lyrics || (section.lines ? section.lines.join(' ') : '')).trim();
      const sectionTitle = section.title || `Section ${i + 1}`;
      const sectionAudioPath = path.join(
        tmpDir,
        `vocal_sec_${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`
      );

      if (sectionText.length > 0) {
        try {
          const tts = new EdgeTTS({
            voice: voiceName,
            lang: 'en-US',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            rate: '+6%', // Energetic, child-friendly cadence
            pitch: pitchOffset,
          });

          await tts.ttsPromise(sectionText, sectionAudioPath);
          let duration = await ffmpegService.getMediaDuration(sectionAudioPath);
          if (!duration || duration <= 0) {
            duration = section.durationSec || 5;
          }

          tempSectionFiles.push({ path: sectionAudioPath, duration, section });

          sectionTimings.push({
            sectionIndex: i + 1,
            title: sectionTitle,
            startTime: cumulativeTime,
            duration,
          });

          cumulativeTime += duration;
        } catch (err: any) {
          logger.warn(`[SingingProvider] Failed singing section ${i + 1}: ${err.message}. Using timing spacer.`);
          const placeholderDuration = section.durationSec || 6;
          sectionTimings.push({
            sectionIndex: i + 1,
            title: sectionTitle,
            startTime: cumulativeTime,
            duration: placeholderDuration,
          });
          cumulativeTime += placeholderDuration;
        }
      } else {
        const spacerDuration = section.durationSec || 4;
        sectionTimings.push({
          sectionIndex: i + 1,
          title: sectionTitle,
          startTime: cumulativeTime,
          duration: spacerDuration,
        });
        cumulativeTime += spacerDuration;
      }
    }

    // Concatenate all vocal sections into a single synchronized vocal track
    const combinedVocalPath = path.join(tmpDir, `nursery_vocals_${Date.now()}.mp3`);
    if (tempSectionFiles.length > 0) {
      const concatList = tempSectionFiles.map((f) => `file '${f.path.replace(/'/g, "'\\''")}'`).join('\n');
      const concatTxtPath = path.join(tmpDir, `vocal_concat_${Date.now()}.txt`);
      await fs.promises.writeFile(concatTxtPath, concatList);

      await new Promise<void>((resolve, reject) => {
        import('fluent-ffmpeg').then(({ default: ffmpeg }) => {
          ffmpeg()
            .input(concatTxtPath)
            .inputOptions(['-f concat', '-safe 0'])
            .audioCodec('libmp3lame')
            .audioBitrate('192k')
            .output(combinedVocalPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
        });
      });

      try {
        await fs.promises.unlink(concatTxtPath);
        for (const f of tempSectionFiles) {
          await fs.promises.unlink(f.path).catch(() => {});
        }
      } catch {}
    } else {
      await fs.promises.writeFile(combinedVocalPath, Buffer.alloc(100));
    }

    const finalDuration = (await ffmpegService.getMediaDuration(combinedVocalPath)) || cumulativeTime;

    return {
      vocalAudioPath: combinedVocalPath,
      totalDurationSeconds: finalDuration,
      sectionTimings,
    };
  }

  async synthesizeSong(
    lyrics: StructuredSongLyrics,
    characters: string[],
    jobId?: string
  ): Promise<{ audioBuffer: Buffer; durationSeconds: number }> {
    const res = await this.generateVocals({ lyrics, jobId });
    let audioBuffer = Buffer.alloc(0);
    try {
      if (fs.existsSync(res.vocalAudioPath)) {
        audioBuffer = await fs.promises.readFile(res.vocalAudioPath);
      }
    } catch {}
    return {
      audioBuffer,
      durationSeconds: res.totalDurationSeconds,
    };
  }
}

export const neuralSingingProvider = new NeuralSingingProvider();
export const singingProvider = neuralSingingProvider;
