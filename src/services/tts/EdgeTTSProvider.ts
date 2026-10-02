import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TTSProvider, AudioResult } from './TTSProvider.js';
import { logger } from '../../utils/logger.js';

export class EdgeTTSProvider implements TTSProvider {
  name = 'EdgeTTSProvider';

  private voiceMap: Record<string, string> = {
    alloy: 'en-US-ChristopherNeural',
    echo: 'en-US-AndrewNeural',
    fable: 'en-US-BrianNeural',
    onyx: 'en-US-GuyNeural',
    nova: 'en-US-AvaNeural',
    shimmer: 'en-US-JennyNeural',
    christopher: 'en-US-ChristopherNeural',
    andrew: 'en-US-AndrewNeural',
    guy: 'en-US-GuyNeural',
    ava: 'en-US-AvaNeural',
    jenny: 'en-US-JennyNeural',
    brian: 'en-US-BrianNeural',
    eric: 'en-US-EricNeural',
  };

  async generateSpeech(text: string, voice?: string): Promise<AudioResult> {
    const rawVoice = (voice || 'alloy').toLowerCase();
    const mappedVoice = this.voiceMap[rawVoice] || (voice?.includes('-') ? voice : 'en-US-ChristopherNeural');

    logger.debug(`Generating EdgeTTS speech with voice: ${mappedVoice}`);

    const tmpFile = path.join(os.tmpdir(), `edge_tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

    const tts = new EdgeTTS({
      voice: mappedVoice,
      lang: mappedVoice.split('-').slice(0, 2).join('-') || 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate: '+8%', // Brisk, energetic pace for viral Shorts retention
    });

    await tts.ttsPromise(text, tmpFile);
    const audioBuffer = await fs.promises.readFile(tmpFile);
    try {
      await fs.promises.unlink(tmpFile);
    } catch {}

    const words = text.split(/\s+/).length;
    const estimatedDuration = Math.round((words / 2.7) * 10) / 10;

    return {
      audioBuffer,
      durationSeconds: estimatedDuration,
      format: 'mp3',
    };
  }
}
