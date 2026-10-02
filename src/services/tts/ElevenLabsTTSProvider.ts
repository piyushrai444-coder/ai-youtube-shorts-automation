import axios from 'axios';
import { TTSProvider, AudioResult } from './TTSProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class ElevenLabsTTSProvider implements TTSProvider {
  name = 'ElevenLabsTTSProvider';
  private apiKey: string;
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.tts.apiKey;
  }

  async generateSpeech(text: string, voiceId?: string): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    const voice = voiceId || config.tts.voice || this.defaultVoiceId;
    logger.debug(`Generating ElevenLabs TTS with voice ID: ${voice}`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    const audioBuffer = Buffer.from(response.data);
    const words = text.split(/\s+/).length;
    const estimatedDuration = Math.round((words / 2.7) * 10) / 10;

    return {
      audioBuffer,
      durationSeconds: estimatedDuration,
      format: 'mp3',
    };
  }
}
