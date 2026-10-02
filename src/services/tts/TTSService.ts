import fs from 'fs';
import path from 'path';
import os from 'os';
import { TTSProvider, AudioResult } from './TTSProvider.js';
import { OpenAITTSProvider } from './OpenAITTSProvider.js';
import { ElevenLabsTTSProvider } from './ElevenLabsTTSProvider.js';
import { EdgeTTSProvider } from './EdgeTTSProvider.js';
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

    const type = (dbProvider || config.tts.provider || 'edge').toLowerCase();
    const apiKey = dbKey || config.tts.apiKey;
    const hasValidKey = Boolean(apiKey && !apiKey.includes('your_') && apiKey.length > 10);

    if (type === 'elevenlabs' && hasValidKey) {
      return new ElevenLabsTTSProvider(apiKey);
    } else if (type === 'openai' && hasValidKey) {
      return new OpenAITTSProvider(apiKey);
    } else {
      return new EdgeTTSProvider();
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
      logger.warn(`Primary TTS provider ${provider.name} failed (${err.message}). Falling back to Microsoft Edge Neural Voice...`, undefined, jobId);
      try {
        const edgeFallback = new EdgeTTSProvider();
        result = await edgeFallback.generateSpeech(text, voice);
        logger.job(jobId || 'sys', 'Successfully generated high-fidelity neural voiceover via Edge TTS');
      } catch (fallbackErr: any) {
        logger.error(`Edge TTS fallback also failed: ${fallbackErr.message}`, undefined, jobId);
        throw fallbackErr;
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

}

export const ttsService = new TTSService();
