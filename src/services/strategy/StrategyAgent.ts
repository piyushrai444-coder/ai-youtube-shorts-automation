import { ContentFormat, HookStyle, StrategyDecision } from '../../types/index.js';
import { shortRepository } from '../../repositories/ShortRepository.js';
import { learningRepository } from '../../repositories/LearningRepository.js';
import { logger } from '../../utils/logger.js';

export class StrategyAgent {
  /**
   * Target baseline content mix percentages:
   * 40% Tool Discovery
   * 25% Demonstration
   * 15% Problem-Solution
   * 10% Comparison / Hidden Feature / Before-After
   * 10% AI News / Challenge
   */
  private static BASELINE_WEIGHTS: Record<ContentFormat, number> = {
    TOOL_DISCOVERY: 0.40,
    DEMONSTRATION: 0.25,
    PROBLEM_SOLUTION: 0.15,
    HIDDEN_FEATURE: 0.05,
    COMPARISON: 0.05,
    BEFORE_AFTER: 0.05,
    AI_NEWS: 0.03,
    CHALLENGE: 0.02,
  };

  /**
   * Plans the strategic format, hook style, and theme for the next Short.
   */
  async planNextShort(slotKey?: string, categoryPreference?: string): Promise<StrategyDecision> {
    logger.info(`[StrategyAgent] Formulating content strategy for slot: ${slotKey || 'ad-hoc'}`);

    // 1. Fetch recent shorts to analyze format distribution
    const recentShorts = await shortRepository.listRecent(15);
    const formatCounts: Partial<Record<ContentFormat, number>> = {};
    for (const s of recentShorts) {
      const fmt = (s.format as ContentFormat) || 'TOOL_DISCOVERY';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }

    // 2. Fetch active learning insights
    const formatInsights = await learningRepository.getActiveInsights('FORMAT');
    const hookInsights = await learningRepository.getActiveInsights('HOOK');

    // 3. Check for active content experiments
    const activeExperiments = await learningRepository.getActiveExperiments();
    let selectedExperimentId: string | undefined;

    // 4. Compute dynamic format weights based on baseline, learning insights, and recent distribution
    const dynamicWeights: Record<ContentFormat, number> = { ...StrategyAgent.BASELINE_WEIGHTS };

    // Apply insights
    for (const insight of formatInsights) {
      for (const fmt of Object.keys(dynamicWeights) as ContentFormat[]) {
        if (insight.title.toUpperCase().includes(fmt)) {
          const multiplier = 1 + (insight.impactScore / 100);
          dynamicWeights[fmt] *= Math.max(0.5, Math.min(2.5, multiplier));
        }
      }
    }

    // Penalize formats that were just used in the last 2 shorts to ensure variety
    if (recentShorts.length > 0) {
      const lastFormat = (recentShorts[0].format as ContentFormat) || 'TOOL_DISCOVERY';
      dynamicWeights[lastFormat] *= 0.3; // significantly reduce chance of back-to-back same format
    }
    if (recentShorts.length > 1) {
      const secondLastFormat = (recentShorts[1].format as ContentFormat) || 'TOOL_DISCOVERY';
      dynamicWeights[secondLastFormat] *= 0.6;
    }

    // If an experiment is running with < 10 samples, boost its format
    if (activeExperiments.length > 0) {
      const exp = activeExperiments[0];
      if (exp.sampleCount < 10 && exp.format in dynamicWeights) {
        dynamicWeights[exp.format as ContentFormat] *= 1.8;
        selectedExperimentId = exp.id;
      }
    }

    // Select format via weighted random selection
    const chosenFormat = this.weightedSelect(dynamicWeights);

    // 5. Select Hook Style
    const hookStyles: HookStyle[] = [
      'CURIOSITY_GAP',
      'CONTRARIAN',
      'RESULT_FIRST',
      'PROBLEM_AGITATION',
      'RELATABLE_FRUSTRATION',
    ];

    // Pick hook style that matches format best or informed by hook insights
    let chosenHookStyle: HookStyle = 'CURIOSITY_GAP';
    if (chosenFormat === 'PROBLEM_SOLUTION') {
      chosenHookStyle = 'PROBLEM_AGITATION';
    } else if (chosenFormat === 'DEMONSTRATION' || chosenFormat === 'BEFORE_AFTER') {
      chosenHookStyle = 'RESULT_FIRST';
    } else if (chosenFormat === 'HIDDEN_FEATURE') {
      chosenHookStyle = 'CURIOSITY_GAP';
    } else if (chosenFormat === 'COMPARISON') {
      chosenHookStyle = 'CONTRARIAN';
    } else {
      chosenHookStyle = hookStyles[Math.floor(Math.random() * hookStyles.length)];
    }

    // 6. Map to visual theme
    let visualTheme: StrategyDecision['visualTheme'] = 'CYBERPUNK_HUD';
    if (chosenFormat === 'DEMONSTRATION' || chosenFormat === 'TOOL_DISCOVERY') {
      visualTheme = 'PRODUCT_DEMO';
    } else if (chosenFormat === 'COMPARISON' || chosenFormat === 'BEFORE_AFTER') {
      visualTheme = 'SPLIT_COMPARISON';
    } else {
      visualTheme = 'MINIMAL_TECH';
    }

    const appliedInsightNotes = [
      ...formatInsights.map(i => `${i.confidence}: ${i.title} (${i.impactScore > 0 ? '+' : ''}${i.impactScore}%)`),
      ...hookInsights.map(i => `${i.confidence}: ${i.title}`),
    ];

    const rationale = `Selected ${chosenFormat} with ${chosenHookStyle} hook. Recent formats: ${Object.entries(formatCounts).map(([f, c]) => `${f}:${c}`).join(', ') || 'none'}. Strategy prioritized practical utility and visual demo potential.`;

    const decision: StrategyDecision = {
      format: chosenFormat,
      hookStyle: chosenHookStyle,
      targetAudienceAngle: 'AI builders, developers, and tech creators wanting practical workflows',
      experimentId: selectedExperimentId,
      rationale,
      visualTheme,
    };

    // Record the strategy run
    await learningRepository.recordStrategyRun({
      slotKey,
      chosenFormat,
      chosenTopicCategory: categoryPreference || 'AI Tools',
      rationale,
      appliedInsights: appliedInsightNotes,
    });

    logger.info(`[StrategyAgent] Strategic Decision: ${chosenFormat} (${chosenHookStyle}) | Theme: ${visualTheme}`);
    return decision;
  }

  private weightedSelect(weights: Record<ContentFormat, number>): ContentFormat {
    const entries = Object.entries(weights) as [ContentFormat, number][];
    const totalWeight = entries.reduce((sum, [, w]) => sum + Math.max(0.01, w), 0);
    let random = Math.random() * totalWeight;

    for (const [format, weight] of entries) {
      random -= Math.max(0.01, weight);
      if (random <= 0) {
        return format;
      }
    }
    return 'TOOL_DISCOVERY';
  }
}

export const strategyAgent = new StrategyAgent();
