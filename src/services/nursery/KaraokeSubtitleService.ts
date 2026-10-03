import fs from 'fs';
import path from 'path';
import os from 'os';
import { KaraokeSubtitleItem, LyricSectionItem, StructuredSongLyrics } from '../../types/index.js';

export class KaraokeSubtitleService {
  /**
   * Generates large, high-contrast, child-friendly karaoke sing-along subtitle files (.srt)
   * with musical notes, bouncy word highlights, and action dance callouts.
   */
  async generateKaraokeSubtitles(lyrics: StructuredSongLyrics): Promise<{ srtPath: string; items: KaraokeSubtitleItem[] }> {
    const items: KaraokeSubtitleItem[] = [];

    for (let i = 0; i < lyrics.sections.length; i++) {
      const section = lyrics.sections[i];
      const startMs = Math.round((section.startSec ?? (i * 5)) * 1000);
      const endMs = Math.round((section.endSec ?? ((section.startSec ?? (i * 5)) + (section.durationSec ?? 5))) * 1000);

      const text = section.lyrics || (section.lines ? section.lines.join(' ') : '');
      const words = text.split(/\s+/).filter(Boolean);
      const wordCount = Math.max(1, words.length);
      const durationPerWord = (endMs - startMs) / wordCount;

      const wordTimings = words.map((word, wIdx) => ({
        word,
        startMs: Math.round(startMs + wIdx * durationPerWord),
        endMs: Math.round(startMs + (wIdx + 1) * durationPerWord),
      }));

      // Action callout if present (e.g. "🎵 JUMP! 🎵")
      let actionCallout: string | undefined;
      if (section.type === 'action_break') {
        const action = section.choreography?.[0] || section.actions?.[0] || 'DANCE';
        actionCallout = `🎵 [ ${action}! ] 🎵`;
      } else if (section.callAndResponse) {
        actionCallout = `🗣️ "${section.callAndResponse.prompt}"`;
      }

      items.push({
        index: i + 1,
        startTime: this.formatSrtTimestamp(startMs),
        endTime: this.formatSrtTimestamp(endMs),
        text: `🎵 ${text} 🎵`,
        actionCallout,
        words: wordTimings,
      });
    }

    const srtContent = items
      .map((item) => {
        let textLine = item.text;
        if (item.actionCallout) {
          textLine += `\n${item.actionCallout}`;
        }
        return `${item.index}\n${item.startTime} --> ${item.endTime}\n${textLine}\n`;
      })
      .join('\n');

    const tmpFile = path.join(
      os.tmpdir(),
      `karaoke_subs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.srt`
    );
    await fs.promises.writeFile(tmpFile, srtContent);

    return { srtPath: tmpFile, items };
  }

  async generateKaraokeSrt(lyrics: StructuredSongLyrics, totalDuration?: number, targetPath?: string): Promise<string> {
    const { srtPath } = await this.generateKaraokeSubtitles(lyrics);
    if (targetPath) {
      await fs.promises.copyFile(srtPath, targetPath);
      return targetPath;
    }
    return srtPath;
  }

  private formatSrtTimestamp(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }
}

export const karaokeSubtitleService = new KaraokeSubtitleService();
