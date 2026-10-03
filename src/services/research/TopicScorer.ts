import { ResearchResult, ScoredTopic, TopicScoreBreakdown } from '../../types/index.js';
import { trendDetector } from './TrendDetector.js';
import { logger } from '../../utils/logger.js';

export class TopicScorer {
  /**
   * Scores an array of candidate topics using the multi-factor viral utility framework.
   */
  scoreTopics(topics: ResearchResult[]): ScoredTopic[] {
    const trendResults = trendDetector.detectTrends(topics);

    return trendResults.map(({ topic, trendScore, sourceCount, extractedEntity }) => {
      const breakdown = this.calculateBreakdown(topic, trendScore, sourceCount, extractedEntity);
      return {
        ...topic,
        ...breakdown,
      };
    });
  }

  private calculateBreakdown(
    topic: ResearchResult,
    trendScore: number,
    sourceCount: number,
    company?: string
  ): TopicScoreBreakdown {
    const titleLower = topic.title.toLowerCase();
    const summaryLower = (topic.summary || '').toLowerCase();
    const combined = `${titleLower} ${summaryLower}`;

    // 1. Freshness Score (15% weight)
    let freshnessScore = 60;
    if (topic.publishedAt) {
      const hoursAgo = (Date.now() - topic.publishedAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo <= 6) freshnessScore = 100;
      else if (hoursAgo <= 12) freshnessScore = 90;
      else if (hoursAgo <= 24) freshnessScore = 80;
      else if (hoursAgo <= 48) freshnessScore = 65;
      else freshnessScore = 40;
    }

    // 2. Practical Usefulness Score (25% weight)
    // Favors practical tools, workflows, productivity boosts, code, automation
    let usefulnessScore = 60;
    const highUtilityKeywords = [
      'tool', 'automation', 'productivity', 'workflow', 'free', 'save hours',
      'developer', 'code', 'coding', 'builder', 'generate', 'create', 'website', 'design',
      'extension', 'plugin', 'app', 'feature', 'assistant', 'prompt', 'agent', 'model'
    ];
    for (const kw of highUtilityKeywords) {
      if (combined.includes(kw)) usefulnessScore += 6;
    }
    usefulnessScore = Math.min(usefulnessScore, 98);

    // 3. Curiosity / Hook Potential (15% weight)
    // Emotional triggers, surprising capabilities, novelty
    let curiosityScore = 55;
    const curiosityKeywords = [
      'insane', 'secret', 'hidden', 'nobody', 'craziest', 'turns', 'replace',
      'better than', 'vs', 'finally', 'just dropped', 'stop doing', 'game changer',
      'one click', 'in seconds', 'leaked', 'launched', 'breakthrough', 'reasoning', 'powers'
    ];
    for (const kw of curiosityKeywords) {
      if (combined.includes(kw)) curiosityScore += 7;
    }
    curiosityScore = Math.min(curiosityScore, 95);

    // 4. Visual Appeal & Demonstrability (15% + 15% demo weight)
    // Can it be shown visually? (Video, UI, images, coding, canvas)
    let visualScore = 60;
    let demoScore = 60;
    const visualKeywords = [
      'ui', 'video', 'image', 'visual', 'canvas', '3d', 'render',
      'demo', 'screenshot', 'design', 'interface', 'web', 'avatar', 'coding', 'code'
    ];
    for (const kw of visualKeywords) {
      if (combined.includes(kw)) {
        visualScore += 6;
        demoScore += 8;
      }
    }
    visualScore = Math.min(visualScore, 95);
    demoScore = Math.min(demoScore, 95);

    // 5. Competition / Saturation Penalty (up to -20)
    // Punish abstract financial reports, policy debate, lawsuits, generic speculation
    let competitionPenalty = 0;
    const lowValueKeywords = [
      'stock', 'shares', 'quarterly', 'earnings', 'lawsuit', 'policy', 'regulation',
      'senate', 'opinion', 'billion', 'valuation', 'funding round', 'layoffs'
    ];
    for (const kw of lowValueKeywords) {
      if (combined.includes(kw)) competitionPenalty += 8;
    }
    competitionPenalty = Math.min(competitionPenalty, 25);

    // Final weighted score: (sums to 1.00 - penalty)
    // Freshness (0.15) + Usefulness (0.25) + Curiosity (0.15) + Visual (0.15) + Trend (0.15) + Demo (0.15) - Penalty (0.10)
    const rawScore =
      freshnessScore * 0.15 +
      usefulnessScore * 0.25 +
      curiosityScore * 0.15 +
      visualScore * 0.15 +
      trendScore * 0.15 +
      demoScore * 0.15 -
      competitionPenalty * 0.10;

    const finalScore = Math.max(10, Math.min(100, Math.round(rawScore * 10) / 10));

    return {
      freshnessScore,
      trendScore,
      usefulnessScore,
      visualScore,
      demoScore,
      competitionPenalty,
      finalScore,
      company,
      sourceCount,
    };
  }
}

export const topicScorer = new TopicScorer();
