import { GeneratedScript } from '../../types/index.js';

export interface ViralityScore {
  overallScore: number; // 0 - 100
  hookScore: number; // 0 - 25
  loopScore: number; // 0 - 25
  pacingScore: number; // 0 - 25
  engagementScore: number; // 0 - 25
  feedback: string[];
  isViralOptimized: boolean;
}

export class ViralityEngine {
  private static VIRAL_TRIGGER_WORDS = [
    'illegal', 'insane', 'crazy', 'secret', 'stop', 'finally',
    'free', '10x', 'replaces', 'blow your mind', 'nobody', 'hack',
    'game changer', 'superpower', 'warning', 'chatgpt'
  ];

  private static ENGAGEMENT_PROMPTS = [
    'comment', 'would you', 'what do you think', 'let me know',
    'share', 'tag a friend', 'save this', 'drop a', 'link'
  ];

  private static LOOP_TRANSITIONS = [
    'which is why', 'and that is why', 'especially with',
    'and the craziest part is', 'it all starts with',
    'leading to', 'check out', 'you need to see'
  ];

  /**
   * Analyzes and scores a generated script against the YouTube Shorts algorithm
   */
  static evaluateVirality(script: GeneratedScript): ViralityScore {
    const feedback: string[] = [];
    let hookScore = 0;
    let loopScore = 0;
    let pacingScore = 0;
    let engagementScore = 0;

    const hookLower = (script.hook || '').toLowerCase().trim();
    const ctaLower = (script.cta || '').toLowerCase().trim();
    const fullLower = (script.fullScript || '').toLowerCase().trim();
    const words = fullLower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. Hook Score (0 - 25)
    const hookWords = hookLower.split(/\s+/).filter(Boolean).length;
    if (hookWords >= 6 && hookWords <= 15) {
      hookScore += 10;
    } else {
      feedback.push('Hook should be between 6 and 15 words for maximum 2-second retention.');
    }

    let triggerCount = 0;
    for (const trigger of this.VIRAL_TRIGGER_WORDS) {
      if (hookLower.includes(trigger)) {
        triggerCount++;
      }
    }
    hookScore += Math.min(15, triggerCount * 6);
    if (triggerCount === 0) {
      feedback.push('Add an emotional pattern interrupt trigger word in the hook (e.g. crazy, secret, stop, replaces).');
    }

    // 2. Loop Score (0 - 25)
    // Check if the CTA ends with an open-ended loop transition to the hook
    let hasLoopTransition = false;
    for (const phrase of this.LOOP_TRANSITIONS) {
      if (ctaLower.includes(phrase)) {
        hasLoopTransition = true;
        break;
      }
    }

    if (hasLoopTransition) {
      loopScore += 25;
    } else {
      loopScore += 12;
      feedback.push('To maximize APV > 100%, end the CTA with an open-ended transition that loops back into the hook.');
    }

    // 3. Pacing Score (0 - 25)
    // Optimal retention for YouTube Shorts is 22 - 27 seconds (58 - 72 words)
    if (wordCount >= 58 && wordCount <= 74) {
      pacingScore += 25;
    } else if (wordCount >= 50 && wordCount <= 78) {
      pacingScore += 18;
    } else {
      pacingScore += 10;
      feedback.push(`Word count is ${wordCount}. Target 58-74 words for highest completion rate.`);
    }

    // 4. Engagement & Comment Driver (0 - 25)
    let hasEngagementTrigger = false;
    for (const prompt of this.ENGAGEMENT_PROMPTS) {
      if (ctaLower.includes(prompt) || fullLower.includes(prompt)) {
        hasEngagementTrigger = true;
        break;
      }
    }

    if (hasEngagementTrigger || ctaLower.includes('?')) {
      engagementScore += 25;
    } else {
      engagementScore += 10;
      feedback.push('Ask a debate question or comment prompt in the CTA to spark algorithmic comment spikes.');
    }

    const overallScore = Math.min(100, hookScore + loopScore + pacingScore + engagementScore);

    return {
      overallScore,
      hookScore,
      loopScore,
      pacingScore,
      engagementScore,
      feedback,
      isViralOptimized: overallScore >= 75,
    };
  }

  /**
   * Generates a high-CTR viral title formula from the script
   */
  static formatViralTitle(rawTitle: string): string {
    let clean = rawTitle.replace(/#Shorts/gi, '').trim();
    if (!clean.includes('!') && !clean.includes('?')) {
      clean += ' 🚀';
    }
    return `${clean} #Shorts`;
  }
}
