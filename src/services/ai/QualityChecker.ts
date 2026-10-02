import { GeneratedScript } from '../../types/index.js';

export interface QualityValidationResult {
  isValid: boolean;
  wordCount: number;
  estimatedDurationSeconds: number;
  errors: string[];
  warnings: string[];
}

export class QualityChecker {
  // Average speaking rate for fast-paced shorts is ~2.6 words per second
  private static WORDS_PER_SECOND = 2.6;
  public static MAX_SECONDS = 30;
  public static MIN_WORDS = 45;
  public static MAX_WORDS = 80;

  static validate(script: GeneratedScript): QualityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Calculate words
    const words = script.fullScript
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0);
    const wordCount = words.length;
    const estimatedDurationSeconds = Math.round((wordCount / this.WORDS_PER_SECOND) * 10) / 10;

    // Check duration & word count
    if (estimatedDurationSeconds > this.MAX_SECONDS) {
      errors.push(`Script is too long! Estimated ${estimatedDurationSeconds}s exceeds 30s limit (${wordCount} words).`);
    }

    if (wordCount > this.MAX_WORDS) {
      errors.push(`Word count (${wordCount}) exceeds maximum allowed (${this.MAX_WORDS} words).`);
    }

    if (wordCount < this.MIN_WORDS) {
      warnings.push(`Script is slightly short (${wordCount} words). Target is 55-75 words.`);
    }

    // Check required components
    if (!script.hook || script.hook.length < 10) {
      errors.push('Script must have a compelling Hook (at least 10 chars).');
    }

    if (!script.explanation || script.explanation.length < 20) {
      errors.push('Script must have an Explanation section.');
    }

    if (!script.benefit || script.benefit.length < 10) {
      errors.push('Script must highlight a main Benefit.');
    }

    if (!script.cta || script.cta.length < 5) {
      errors.push('Script must include a Call to Action (CTA).');
    }

    // Check for spammy or forbidden claims
    const forbiddenPhrases = [
      'guaranteed millionaire',
      'secret trick revealed',
      'unlimited free money',
      'cure for cancer',
      '100% replacement for humans',
    ];

    const lower = script.fullScript.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (lower.includes(phrase)) {
        errors.push(`Script contains forbidden sensational claim: "${phrase}".`);
      }
    }

    // Title validation
    if (!script.title || script.title.length < 10) {
      errors.push('Title must be at least 10 characters.');
    }
    if (script.title.length > 95) {
      warnings.push('Title exceeds 95 characters, which may truncate on mobile.');
    }

    return {
      isValid: errors.length === 0,
      wordCount,
      estimatedDurationSeconds,
      errors,
      warnings,
    };
  }
}
