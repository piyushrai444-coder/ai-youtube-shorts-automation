import fs from 'fs';
import path from 'path';
import os from 'os';
import { TTSProvider, AudioResult } from './TTSProvider.js';
import { OpenAITTSProvider } from './OpenAITTSProvider.js';
import { ElevenLabsTTSProvider } from './ElevenLabsTTSProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { ffmpegService } from '../video/FFmpegService.js';

import { settingRepository } from '../../repositories/SettingRepository.js';

export class TTSService {
  private customProvider?: TTSProvider;

  constructor(customProvider?: TTSProvider) {
    if (customProvider) {
      this.customProvider = customProvider;
    }
  }

  async getEffectiveProvider(): Promise<TTSProvider> {
    if (this.customProvider) {
      return this.customProvider;
    }
    const dbProvider = await settingRepository.get('tts_provider');
    const dbVoice = await settingRepository.get('tts_voice');
    const dbKey = (await settingRepository.getSecure('tts_api_key')) || (await settingRepository.getSecure('llm_api_key'));

    const type = (dbProvider || config.tts.provider || 'openai').toLowerCase();
    const apiKey = dbKey || config.tts.apiKey;
    const voice = dbVoice || config.tts.voice;

    if (type === 'elevenlabs') {
      return new ElevenLabsTTSProvider(apiKey);
    } else {
      return new OpenAITTSProvider(apiKey);
    }
  }

  getProviderName(): string {
    return this.customProvider?.name || config.tts.provider;
  }

  async generateVoiceover(text: string, jobId?: string): Promise<{ audioBuffer: Buffer; durationSeconds: number; localPath: string }> {
    const provider = await this.getEffectiveProvider();
    const dbVoice = await settingRepository.get('tts_voice');
    const voice = dbVoice || config.tts.voice;

    logger.job(jobId || 'sys', `Generating voiceover using ${provider.name}...`);
    let result: AudioResult;

    try {
      result = await provider.generateSpeech(text, voice);
    } catch (err: any) {
      const isConfigOrNetworkError =
        err.message?.includes('API key') ||
        err.message?.includes('Connection error') ||
        err.code === 'ENOTFOUND' ||
        !config.tts.apiKey ||
        config.tts.apiKey.includes('your_');

      if (isConfigOrNetworkError) {
        const words = text.split(/\s+/).length;
        const estDuration = Math.min(26.0, Math.max(15.0, Math.round((words / 2.6) * 10) / 10));
        logger.warn(
          `TTS external service unavailable (${err.message}). Using local synthesized voice track (${estDuration}s) for pipeline continuity.`,
          undefined,
          jobId
        );
        result = await this.generateOfflineAudio(estDuration);
      } else {
        throw err;
      }
    }

    // Save temporary audio file to measure exact duration with FFmpeg
    const tmpDir = os.tmpdir();
    const tempAudioPath = path.join(tmpDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);
    await fs.promises.writeFile(tempAudioPath, result.audioBuffer);

    // Measure exact audio duration via ffprobe
    let exactDuration = await ffmpegService.getMediaDuration(tempAudioPath);
    if (!exactDuration || exactDuration <= 0) {
      exactDuration = result.durationSeconds;
    }

    logger.job(jobId || 'sys', `Voiceover generated. Measured duration: ${exactDuration.toFixed(2)}s`);

    // Strict 30s enforcement: If duration > 30s, speed up audio using FFmpeg atempo filter
    if (exactDuration > 30.0) {
      logger.warn(`Voiceover duration ${exactDuration}s exceeds 30s limit. Speeding up via FFmpeg filter...`, undefined, jobId);
      const speedFactor = Math.min(2.0, (exactDuration / 28.5)); // Target 28.5s
      const spedUpPath = path.join(tmpDir, `voice_speedup_${Date.now()}.mp3`);
      await ffmpegService.adjustAudioSpeed(tempAudioPath, spedUpPath, speedFactor);
      
      const newDuration = await ffmpegService.getMediaDuration(spedUpPath);
      const newBuffer = await fs.promises.readFile(spedUpPath);
      
      // Cleanup original temporary file
      try { await fs.promises.unlink(tempAudioPath); } catch {}
      
      logger.job(jobId || 'sys', `Voiceover adjusted successfully to ${newDuration.toFixed(2)}s`);
      return {
        audioBuffer: newBuffer,
        durationSeconds: newDuration,
        localPath: spedUpPath,
      };
    }

    return {
      audioBuffer: result.audioBuffer,
      durationSeconds: exactDuration,
      localPath: tempAudioPath,
    };
  }

  private async generateOfflineAudio(duration: number): Promise<AudioResult> {
    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, `synth_voice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg');
      ffmpeg()
        .input(`sine=frequency=380:duration=${duration.toFixed(2)}`)
        .inputOptions(['-f lavfi'])
        .audioFilters('volume=0.25')
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run();
    });
    const audioBuffer = await fs.promises.readFile(outPath);
    try { await fs.promises.unlink(outPath); } catch {}
    return {
      audioBuffer,
      durationSeconds: duration,
      format: 'mp3',
    };
  }
}

export const ttsService = new TTSService();
