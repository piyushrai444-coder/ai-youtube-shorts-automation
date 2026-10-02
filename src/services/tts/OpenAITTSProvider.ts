import OpenAI from 'openai';
import { TTSProvider, AudioResult } from './TTSProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class OpenAITTSProvider implements TTSProvider {
  name = 'OpenAITTSProvider';
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || config.tts.apiKey;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    }
  }

  async generateSpeech(text: string, voice?: string): Promise<AudioResult> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured for TTS');
    }

    const selectedVoice = (voice || config.tts.voice || 'alloy') as any;
    logger.debug(`Generating OpenAI TTS speech with voice: ${selectedVoice}`);

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: text,
      response_format: 'mp3',
      speed: 1.05, // Slightly brisk pace for high-retention Shorts
    });

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Initial estimate based on words, precise duration will be measured by ffprobe in TTSService
    const words = text.split(/\s+/).length;
    const estimatedDuration = Math.round((words / 2.7) * 10) / 10;

    return {
      audioBuffer,
      durationSeconds: estimatedDuration,
      format: 'mp3',
    };
  }
}
