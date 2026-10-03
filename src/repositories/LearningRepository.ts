import { prisma } from '../config/database.js';
import {
  PerformanceSnapshot,
  LearningInsight,
  ContentExperiment,
  StrategyRun,
  HookVariant,
} from '@prisma/client';
import { VideoAnalyticsMetric, HookVariantItem, LearningInsightData } from '../types/index.js';

export class LearningRepository {
  // --- Performance Snapshots ---
  async createSnapshot(data: {
    shortId: string;
    youtubeVideoId: string;
    snapshotPeriod: string;
    metrics: VideoAnalyticsMetric;
  }): Promise<PerformanceSnapshot> {
    return prisma.performanceSnapshot.create({
      data: {
        shortId: data.shortId,
        youtubeVideoId: data.youtubeVideoId,
        snapshotPeriod: data.snapshotPeriod,
        views: data.metrics.views,
        likes: data.metrics.likes,
        comments: data.metrics.comments,
        shares: data.metrics.shares,
        subscribersGained: data.metrics.subscribersGained,
        viewedVsSwiped: data.metrics.viewedVsSwiped ?? null,
        avgViewDuration: data.metrics.avgViewDuration ?? null,
        avgPercentageViewed: data.metrics.avgPercentageViewed ?? null,
        estimatedRetentionRate: data.metrics.estimatedRetentionRate ?? null,
        rawAnalytics: data.metrics.rawAnalytics ?? null,
      },
    });
  }

  async getLatestSnapshots(limit: number = 50): Promise<PerformanceSnapshot[]> {
    return prisma.performanceSnapshot.findMany({
      orderBy: { fetchedAt: 'desc' },
      take: limit,
      include: {
        short: {
          select: {
            title: true,
            format: true,
            hookStyle: true,
            category: true,
            performanceClass: true,
            uploadedAt: true,
          },
        },
      },
    });
  }

  async getSnapshotsForShort(shortId: string): Promise<PerformanceSnapshot[]> {
    return prisma.performanceSnapshot.findMany({
      where: { shortId },
      orderBy: { fetchedAt: 'asc' },
    });
  }

  // --- Learning Insights ---
  async saveInsight(data: LearningInsightData): Promise<LearningInsight> {
    // Check if similar insight already exists to update confidence/sampleSize
    const existing = await prisma.learningInsight.findFirst({
      where: {
        category: data.category,
        title: data.title,
      },
    });

    if (existing) {
      return prisma.learningInsight.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          impactScore: data.impactScore,
          sampleSize: existing.sampleSize + 1,
          confidence: data.confidence,
          actionableRule: data.actionableRule ?? existing.actionableRule,
          active: true,
        },
      });
    }

    return prisma.learningInsight.create({
      data: {
        category: data.category,
        title: data.title,
        description: data.description,
        metric: data.metric,
        impactScore: data.impactScore,
        sampleSize: data.sampleSize || 1,
        confidence: data.confidence,
        actionableRule: data.actionableRule ?? null,
        active: true,
      },
    });
  }

  async getActiveInsights(category?: string): Promise<LearningInsight[]> {
    const where: any = { active: true };
    if (category) {
      where.category = category;
    }
    return prisma.learningInsight.findMany({
      where,
      orderBy: [
        { impactScore: 'desc' },
        { sampleSize: 'desc' },
      ],
    });
  }

  // --- Content Experiments ---
  async getActiveExperiments(): Promise<ContentExperiment[]> {
    return prisma.contentExperiment.findMany({
      where: { status: 'ACTIVE' },
      include: { shorts: true },
    });
  }

  async createExperiment(data: {
    name: string;
    format: string;
    hookStyle?: string;
    hypothesis?: string;
    targetMetric?: string;
  }): Promise<ContentExperiment> {
    return prisma.contentExperiment.create({
      data: {
        name: data.name,
        format: data.format,
        hookStyle: data.hookStyle ?? null,
        hypothesis: data.hypothesis ?? null,
        targetMetric: data.targetMetric || 'avgPercentageViewed',
        status: 'ACTIVE',
      },
    });
  }

  async updateExperimentStats(id: string, isWin: boolean): Promise<ContentExperiment> {
    return prisma.contentExperiment.update({
      where: { id },
      data: {
        sampleCount: { increment: 1 },
        ...(isWin ? { winCount: { increment: 1 } } : {}),
      },
    });
  }

  // --- Hook Variants ---
  async saveHookVariants(shortId: string | null, topicId: string | null, variants: HookVariantItem[]): Promise<HookVariant[]> {
    const results: HookVariant[] = [];
    for (const v of variants) {
      const created = await prisma.hookVariant.create({
        data: {
          shortId,
          topicId,
          hookText: v.hookText,
          patternType: v.patternType,
          clarityScore: v.clarityScore,
          curiosityScore: v.curiosityScore,
          specificityScore: v.specificityScore,
          valueScore: v.valueScore,
          totalScore: v.totalScore,
          selected: v.selected || false,
        },
      });
      results.push(created);
    }
    return results;
  }

  // --- Strategy Runs ---
  async recordStrategyRun(data: {
    slotKey?: string;
    chosenFormat: string;
    chosenTopicCategory: string;
    rationale: string;
    appliedInsights?: any;
  }): Promise<StrategyRun> {
    return prisma.strategyRun.create({
      data: {
        slotKey: data.slotKey ?? null,
        chosenFormat: data.chosenFormat,
        chosenTopicCategory: data.chosenTopicCategory,
        rationale: data.rationale,
        appliedInsights: data.appliedInsights ?? null,
      },
    });
  }

  async getRecentStrategyRuns(limit: number = 10): Promise<StrategyRun[]> {
    return prisma.strategyRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const learningRepository = new LearningRepository();
