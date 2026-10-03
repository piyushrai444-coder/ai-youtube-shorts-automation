import { ContentFormat, HookStyle, HookVariantItem, ResearchResult } from '../../types/index.js';
import { learningRepository } from '../../repositories/LearningRepository.js';
import { logger } from '../../utils/logger.js';

export class HookAgent {
  /**
   * Generates at least 5 distinct hook variants for a given topic and content format,
   * evaluates each hook on Clarity, Curiosity, Specificity, and Value,
   * and returns the highest-scoring hook.
   */
  async generateAndSelectHooks(
    topic: ResearchResult,
    format: ContentFormat,
    preferredStyle?: HookStyle,
    shortId?: string,
    topicId?: string,
    jobId?: string
  ): Promise<{ selectedHook: HookVariantItem; allVariants: HookVariantItem[] }> {
    logger.job(jobId || 'sys', `[HookAgent] Generating 5 hook variants for "${topic.title}" (${format})`);

    const cleanTitle = topic.title.replace(/[^\w\s-]/g, '').trim();
    const cleanCompany = topic.source || 'AI';

    // Generate 5 distinct hook variants tailored to the format and topic
    const variants: HookVariantItem[] = [
      this.buildCuriosityHook(cleanTitle, format),
      this.buildContrarianHook(cleanTitle, format),
      this.buildResultFirstHook(cleanTitle, format),
      this.buildProblemAgitationHook(cleanTitle, format),
      this.buildRelatableFrustrationHook(cleanTitle, format),
    ];

    // Score all variants
    for (const v of variants) {
      this.scoreHook(v, preferredStyle);
    }

    // Sort by totalScore descending
    variants.sort((a, b) => b.totalScore - a.totalScore);

    // Select the best hook
    variants[0].selected = true;
    const selectedHook = variants[0];

    logger.job(
      jobId || 'sys',
      `[HookAgent] Selected winning hook [${selectedHook.patternType}] Score: ${selectedHook.totalScore}/100: "${selectedHook.hookText}"`
    );

    // Save all generated hook variants in database for learning analytics
    try {
      await learningRepository.saveHookVariants(shortId || null, topicId || null, variants);
    } catch (err: any) {
      logger.debug(`Could not save hook variants to DB: ${err.message}`);
    }

    return {
      selectedHook,
      allVariants: variants,
    };
  }

  private buildCuriosityHook(title: string, format: ContentFormat): HookVariantItem {
    let hookText = `I found an AI tool that solves this in 10 seconds.`;
    if (format === 'HIDDEN_FEATURE') {
      hookText = `Almost nobody knows this secret AI feature exists, but it changes everything.`;
    } else if (format === 'TOOL_DISCOVERY') {
      hookText = `I found a brand new AI tool for ${title.slice(0, 35)}.`;
    } else {
      hookText = `This new AI breakthrough for ${title.slice(0, 30)} feels completely illegal.`;
    }

    return {
      hookText,
      patternType: 'CURIOSITY_GAP',
      clarityScore: 0,
      curiosityScore: 0,
      specificityScore: 0,
      valueScore: 0,
      totalScore: 0,
    };
  }

  private buildContrarianHook(title: string, format: ContentFormat): HookVariantItem {
    let hookText = `Stop doing this manually in 2026.`;
    if (format === 'COMPARISON') {
      hookText = `ChatGPT vs this new AI tool. The results are not even close.`;
    } else {
      hookText = `Stop wasting hours on ${title.slice(0, 30)}. Use this instead.`;
    }

    return {
      hookText,
      patternType: 'CONTRARIAN',
      clarityScore: 0,
      curiosityScore: 0,
      specificityScore: 0,
      valueScore: 0,
      totalScore: 0,
    };
  }

  private buildResultFirstHook(title: string, format: ContentFormat): HookVariantItem {
    let hookText = `I gave this AI one prompt. Here is what it created in 15 seconds.`;
    if (format === 'BEFORE_AFTER') {
      hookText = `Before: 2 hours of tedious work. After: 15 seconds with AI.`;
    } else if (format === 'DEMONSTRATION') {
      hookText = `Watch what happens when you give this new AI tool one single prompt.`;
    }

    return {
      hookText,
      patternType: 'RESULT_FIRST',
      clarityScore: 0,
      curiosityScore: 0,
      specificityScore: 0,
      valueScore: 0,
      totalScore: 0,
    };
  }

  private buildProblemAgitationHook(title: string, format: ContentFormat): HookVariantItem {
    const hookText = `Still spending hours on ${title.slice(0, 25)}? This AI completely automates it.`;
    return {
      hookText,
      patternType: 'PROBLEM_AGITATION',
      clarityScore: 0,
      curiosityScore: 0,
      specificityScore: 0,
      valueScore: 0,
      totalScore: 0,
    };
  }

  private buildRelatableFrustrationHook(title: string, format: ContentFormat): HookVariantItem {
    const hookText = `If you're tired of repetitive tasks, this new AI update was made for you.`;
    return {
      hookText,
      patternType: 'RELATABLE_FRUSTRATION',
      clarityScore: 0,
      curiosityScore: 0,
      specificityScore: 0,
      valueScore: 0,
      totalScore: 0,
    };
  }

  private scoreHook(variant: HookVariantItem, preferredStyle?: HookStyle): void {
    const words = variant.hookText.split(/\s+/).filter(Boolean);
    const textLower = variant.hookText.toLowerCase();

    // 1. Clarity (0-25): Punchy, short (under 16 words), zero filler
    let clarity = 20;
    if (words.length <= 12) clarity = 24;
    else if (words.length <= 16) clarity = 21;
    else clarity = 15;
    if (textLower.includes('moreover') || textLower.includes('additionally')) clarity -= 5;

    // 2. Curiosity (0-25): Intrigue, surprise
    let curiosity = 18;
    const curiosityTerms = ['illegal', 'secret', 'nobody knows', 'watch what happens', 'results', 'changes everything', 'stop'];
    for (const term of curiosityTerms) {
      if (textLower.includes(term)) curiosity += 4;
    }
    curiosity = Math.min(25, curiosity);

    // 3. Specificity (0-25): Concrete timeframes, numbers, or targets
    let specificity = 16;
    if (/\d+/.test(textLower) || textLower.includes('seconds') || textLower.includes('hours') || textLower.includes('one')) {
      specificity += 5;
    }
    if (textLower.includes('prompt') || textLower.includes('tool') || textLower.includes('feature')) {
      specificity += 3;
    }
    specificity = Math.min(25, specificity);

    // 4. Immediate Value (0-25): Clear user benefit
    let value = 18;
    const valueTerms = ['automates', 'free', 'creates', 'faster', 'solves', 'built', 'save'];
    for (const term of valueTerms) {
      if (textLower.includes(term)) value += 3;
    }
    value = Math.min(25, value);

    // Match preferred style bonus
    if (preferredStyle && variant.patternType.includes(preferredStyle)) {
      curiosity = Math.min(25, curiosity + 3);
    }

    variant.clarityScore = clarity;
    variant.curiosityScore = curiosity;
    variant.specificityScore = specificity;
    variant.valueScore = value;
    variant.totalScore = clarity + curiosity + specificity + value;
  }
}

export const hookAgent = new HookAgent();
