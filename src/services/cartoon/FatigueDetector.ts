import { characterRepository } from '../../repositories/CharacterRepository.js';
import { storyRepository } from '../../repositories/StoryRepository.js';
import { logger } from '../../utils/logger.js';

export interface FatigueAnalysis {
  fatiguedCharacters: string[];
  fatiguedFormats: string[];
  recentCharacters: string[];
  recommendedFormats: string[];
}

export class FatigueDetector {
  /**
   * Analyzes recent shorts history to prevent audience fatigue on characters or story tropes.
   */
  async checkFatigue(lookbackCount: number = 5): Promise<FatigueAnalysis> {
    let recentCharacters: string[] = [];
    let recentFormats: string[] = [];

    try {
      recentCharacters = await characterRepository.getRecentAppearedNames(lookbackCount);
      recentFormats = await storyRepository.findRecentUsedFormats(lookbackCount);
    } catch (err: any) {
      logger.debug(`[FatigueDetector] DB lookup note: ${err.message}. Using default rotation pool.`);
    }


    // Count character frequencies in recent shorts
    const charCount: Record<string, number> = {};
    for (const name of recentCharacters) {
      charCount[name] = (charCount[name] || 0) + 1;
    }

    // A character is fatigued if they appeared in 3 or more of the last 5 shorts
    const fatiguedCharacters = Object.entries(charCount)
      .filter(([_, count]) => count >= 3)
      .map(([name]) => name);

    // A format is fatigued if it appeared 2 or more times recently
    const formatCount: Record<string, number> = {};
    for (const fmt of recentFormats) {
      formatCount[fmt] = (formatCount[fmt] || 0) + 1;
    }
    const fatiguedFormats = Object.entries(formatCount)
      .filter(([_, count]) => count >= 2)
      .map(([fmt]) => fmt);

    // All possible formats
    const allFormats = [
      'FUNNY_MISUNDERSTANDING',
      'UNEXPECTED_ENDING',
      'EMOTIONAL_RESCUE',
      'MINI_ADVENTURE',
      'PROBLEM_SOLVER',
      'CLEVER_UNDERDOG',
      'WHOLESOME_FRIENDSHIP',
      'WAIT_TILL_END',
      'DAILY_COMEDY',
    ];

    const recommendedFormats = allFormats.filter((f) => !fatiguedFormats.includes(f));

    if (fatiguedCharacters.length > 0) {
      logger.info(`[FatigueDetector] Character fatigue detected for: ${fatiguedCharacters.join(', ')}`);
    }
    if (fatiguedFormats.length > 0) {
      logger.info(`[FatigueDetector] Format fatigue detected for: ${fatiguedFormats.join(', ')}`);
    }

    return {
      fatiguedCharacters,
      fatiguedFormats,
      recentCharacters,
      recommendedFormats,
    };
  }
}

export const fatigueDetector = new FatigueDetector();
