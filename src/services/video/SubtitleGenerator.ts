import fs from 'fs';
import path from 'path';
import { SubtitleItem } from '../../types/index.js';

export class SubtitleGenerator {
  /**
   * Generates synchronized subtitle items from script and measured audio duration
   */
  static generateSubtitleItems(scriptText: string, totalDurationSeconds: number): SubtitleItem[] {
    const rawWords = scriptText.trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    // Break into natural speaking chunks of 3-5 words
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const word of rawWords) {
      currentChunk.push(word);
      // Split on punctuation or when chunk reaches 4 words
      const hasPunctuation = /[.,!?;:]$/.test(word);
      if (currentChunk.length >= 4 || (hasPunctuation && currentChunk.length >= 2)) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    const totalWords = rawWords.length;
    const items: SubtitleItem[] = [];
    let currentSec = 0.2; // slight 200ms initial offset

    const availableDuration = Math.max(1, totalDurationSeconds - 0.4);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkWordCount = chunk.split(/\s+/).length;
      const chunkDuration = (chunkWordCount / totalWords) * availableDuration;
      const endSec = Math.min(totalDurationSeconds, currentSec + chunkDuration);

      items.push({
        index: i + 1,
        startTime: this.formatSrtTime(currentSec),
        endTime: this.formatSrtTime(endSec),
        text: chunk.toUpperCase(), // High-impact uppercase for Shorts
        rawStartSec: currentSec,
        rawEndSec: endSec,
      });

      currentSec = endSec;
    }

    return items;
  }

  /**
   * Generates standard .srt file content
   */
  static generateSrtContent(items: SubtitleItem[]): string {
    return items
      .map((item) => `${item.index}\n${item.startTime} --> ${item.endTime}\n${item.text}\n`)
      .join('\n');
  }

  /**
   * Saves SRT file to disk and returns its path
   */
  static async writeSrtFile(
    scriptText: string,
    totalDurationSeconds: number,
    outputPath: string
  ): Promise<string> {
    const items = this.generateSubtitleItems(scriptText, totalDurationSeconds);
    const srtContent = this.generateSrtContent(items);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, srtContent, 'utf8');
    return outputPath;
  }

  private static formatSrtTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    const pad = (n: number, z: number = 2) => ('00' + n).slice(-z);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
  }
}
