import { shortRepository } from '../../repositories/ShortRepository.js';
import { learningRepository } from '../../repositories/LearningRepository.js';
import { PerformanceClass } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class PerformanceAnalyst {
  /**
   * Evaluates all uploaded Shorts, updates rolling performance tiers,
   * detects format & hook patterns, and updates learning memory.
   */
  async analyzeChannelPerformance(): Promise<{
    analyzedCount: number;
    patternsIdentified: number;
    topPerformerTitles: string[];
  }> {
    logger.info('[PerformanceAnalyst] Starting channel performance analysis...');

    // 1. Fetch all uploaded shorts with snapshots
    const uploadedShorts = await shortRepository.listUploadedForAnalysis(100);
    if (uploadedShorts.length === 0) {
      logger.info('[PerformanceAnalyst] No uploaded shorts available to analyze.');
      return { analyzedCount: 0, patternsIdentified: 0, topPerformerTitles: [] };
    }

    // 2. Extract metrics for percentile ranking
    const shortsWithMetrics = uploadedShorts.map(s => {
      const latestSnapshot = s.performanceSnapshots[0];
      const views = latestSnapshot?.views || 0;
      const apv = latestSnapshot?.avgPercentageViewed || 0;
      const vvs = latestSnapshot?.viewedVsSwiped || 0;
      return {
        short: s,
        views,
        apv,
        vvs,
        compositeScore: apv * 0.6 + Math.min(views, 5000) * 0.4,
      };
    });

    // 3. Compute percentiles
    shortsWithMetrics.sort((a, b) => b.compositeScore - a.compositeScore);
    const n = shortsWithMetrics.length;

    const topPerformerTitles: string[] = [];

    for (let i = 0; i < n; i++) {
      const item = shortsWithMetrics[i];
      const percentileRank = 1 - (i / n); // 1.0 (top) down to 0.0 (bottom)

      let perfClass: PerformanceClass = 'AVERAGE';
      if (percentileRank >= 0.90) {
        perfClass = 'TOP_PERFORMER';
        topPerformerTitles.push(item.short.title);
      } else if (percentileRank >= 0.70) {
        perfClass = 'ABOVE_AVERAGE';
      } else if (percentileRank >= 0.30) {
        perfClass = 'AVERAGE';
      } else if (percentileRank >= 0.10) {
        perfClass = 'BELOW_AVERAGE';
      } else {
        perfClass = 'POOR';
      }

      // Update short record if performance class changed
      if (item.short.performanceClass !== perfClass) {
        await shortRepository.update(item.short.id, { performanceClass: perfClass });
      }
    }

    // 4. Group by Format & calculate stats
    const formatStats: Record<string, { count: number; totalApv: number; totalViews: number; wins: number }> = {};
    const hookStats: Record<string, { count: number; totalVvs: number; totalApv: number }> = {};

    for (const item of shortsWithMetrics) {
      const fmt = item.short.format || 'TOOL_DISCOVERY';
      if (!formatStats[fmt]) {
        formatStats[fmt] = { count: 0, totalApv: 0, totalViews: 0, wins: 0 };
      }
      formatStats[fmt].count++;
      formatStats[fmt].totalApv += item.apv;
      formatStats[fmt].totalViews += item.views;
      if (item.short.performanceClass === 'TOP_PERFORMER' || item.short.performanceClass === 'ABOVE_AVERAGE') {
        formatStats[fmt].wins++;
      }

      const hookStyle = item.short.hookStyle || 'CURIOSITY_GAP';
      if (!hookStats[hookStyle]) {
        hookStats[hookStyle] = { count: 0, totalVvs: 0, totalApv: 0 };
      }
      hookStats[hookStyle].count++;
      hookStats[hookStyle].totalVvs += item.vvs;
      hookStats[hookStyle].totalApv += item.apv;
    }

    // 5. Derive Learning Insights based on statistical sample size
    let patternsIdentified = 0;
    const overallAvgApv = shortsWithMetrics.reduce((acc, m) => acc + m.apv, 0) / Math.max(1, n);

    for (const [fmt, stats] of Object.entries(formatStats)) {
      if (stats.count >= 3) {
        const avgApv = stats.totalApv / stats.count;
        const lift = overallAvgApv > 0 ? ((avgApv - overallAvgApv) / overallAvgApv) * 100 : 0;

        let confidence: 'OBSERVATION' | 'HYPOTHESIS' | 'STRONG_PATTERN' = 'OBSERVATION';
        if (stats.count >= 10) confidence = 'STRONG_PATTERN';
        else if (stats.count >= 5) confidence = 'HYPOTHESIS';

        const direction = lift >= 0 ? 'outperforming' : 'underperforming';
        await learningRepository.saveInsight({
          category: 'FORMAT',
          title: `Format ${fmt} ${direction}`,
          description: `${fmt} format shows ${Math.round(lift)}% APV relative to channel average across ${stats.count} videos.`,
          metric: 'avgPercentageViewed',
          impactScore: Math.round(lift),
          sampleSize: stats.count,
          confidence,
          actionableRule: lift > 15
            ? `Increase frequency of ${fmt} format in weekly schedule.`
            : lift < -15
            ? `Rethink presentation or reduce frequency of ${fmt} format.`
            : undefined,
        });
        patternsIdentified++;
      }
    }

    // 6. Hook Insights
    for (const [hookStyle, stats] of Object.entries(hookStats)) {
      if (stats.count >= 3) {
        let confidence: 'OBSERVATION' | 'HYPOTHESIS' | 'STRONG_PATTERN' = 'OBSERVATION';
        if (stats.count >= 10) confidence = 'STRONG_PATTERN';
        else if (stats.count >= 5) confidence = 'HYPOTHESIS';

        const avgVvs = stats.totalVvs / stats.count;
        await learningRepository.saveInsight({
          category: 'HOOK',
          title: `Hook style ${hookStyle}`,
          description: `Hook style ${hookStyle} achieved ${Math.round(avgVvs)}% Viewed vs Swiped rate across ${stats.count} videos.`,
          metric: 'viewedVsSwiped',
          impactScore: Math.round(avgVvs - 60),
          sampleSize: stats.count,
          confidence,
        });
        patternsIdentified++;
      }
    }

    logger.info(
      `[PerformanceAnalyst] Analysis complete. Evaluated ${n} videos, ${patternsIdentified} insights synthesized.`
    );

    return {
      analyzedCount: n,
      patternsIdentified,
      topPerformerTitles,
    };
  }
}

export const performanceAnalyst = new PerformanceAnalyst();
