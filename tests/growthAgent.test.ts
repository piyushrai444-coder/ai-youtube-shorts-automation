import { topicScorer } from '../src/services/research/TopicScorer.js';
import { trendDetector } from '../src/services/research/TrendDetector.js';
import { hookAgent } from '../src/services/ai/HookAgent.js';
import { strategyAgent } from '../src/services/strategy/StrategyAgent.js';
import { performanceAnalyst } from '../src/services/learning/PerformanceAnalyst.js';
import { shortRepository } from '../src/repositories/ShortRepository.js';
import { learningRepository } from '../src/repositories/LearningRepository.js';
import { ResearchResult } from '../src/types/index.js';

describe('Self-Learning YouTube Shorts Growth Agent', () => {
  describe('TrendDetector & TopicScorer', () => {
    it('should detect cross-source mentions and compute trend score', () => {
      const candidates: ResearchResult[] = [
        {
          title: 'Claude 3.7 Sonnet launched with hybrid reasoning',
          source: 'TechCrunch',
          sourceUrl: 'https://example.com/claude-launch',
          summary: 'Anthropic announces Claude 3.7 with coding powers',
          category: 'AI Coding',
          contentHash: 'hash-claude-1',
          publishedAt: new Date(),
        },
        {
          title: 'How to use Claude 3.7 for automatic agent building',
          source: 'VentureBeat',
          sourceUrl: 'https://example.com/claude-agent',
          summary: 'Developers build workflow agents with Claude',
          category: 'AI Agents',
          contentHash: 'hash-claude-2',
          publishedAt: new Date(),
        },
      ];

      const scored = topicScorer.scoreTopics(candidates);
      expect(scored.length).toBe(2);

      // Should identify Claude entity
      expect(scored[0].company).toBe('Claude');
      expect(scored[0].sourceCount).toBeGreaterThanOrEqual(2);
      expect(scored[0].finalScore).toBeGreaterThanOrEqual(70);
      expect(scored[0].usefulnessScore).toBeGreaterThanOrEqual(60);
    });

    it('should apply competition penalty to financial speculation and lawsuits', () => {
      const boringCandidate: ResearchResult = {
        title: 'Tech quarterly earnings report and senate regulation debate',
        source: 'FinanceDaily',
        sourceUrl: 'https://example.com/finance',
        summary: 'Stock shares drop amid valuation debate and lawsuit funding round',
        category: 'AI News',
        contentHash: 'hash-boring',
        publishedAt: new Date(Date.now() - 72 * 3600 * 1000), // 3 days old
      };

      const [scored] = topicScorer.scoreTopics([boringCandidate]);
      expect(scored.competitionPenalty).toBeGreaterThan(0);
      expect(scored.freshnessScore).toBeLessThan(50);
      expect(scored.finalScore).toBeLessThan(60);
    });
  });

  describe('HookAgent', () => {
    it('should generate at least 5 distinct hook variants with multi-factor scoring', async () => {
      const topic: ResearchResult = {
        title: 'Cursor AI Composer 2.0',
        source: 'Cursor',
        sourceUrl: 'https://cursor.com',
        summary: 'Automate entire full-stack apps in 20 seconds',
        category: 'AI Coding',
        contentHash: 'hash-cursor',
      };

      const result = await hookAgent.generateAndSelectHooks(topic, 'DEMONSTRATION', 'RESULT_FIRST');

      expect(result.allVariants.length).toBe(5);
      expect(result.selectedHook).toBeDefined();
      expect(result.selectedHook.totalScore).toBeGreaterThan(0);

      // Verify variant pattern types
      const patternTypes = result.allVariants.map(v => v.patternType);
      expect(patternTypes).toContain('CURIOSITY_GAP');
      expect(patternTypes).toContain('CONTRARIAN');
      expect(patternTypes).toContain('RESULT_FIRST');
      expect(patternTypes).toContain('PROBLEM_AGITATION');
      expect(patternTypes).toContain('RELATABLE_FRUSTRATION');
    });
  });

  describe('StrategyAgent', () => {
    it('should plan a valid strategic decision with format, hook style, and theme', async () => {
      jest.spyOn(shortRepository, 'listRecent').mockResolvedValue([]);
      jest.spyOn(learningRepository, 'getActiveInsights').mockResolvedValue([]);
      jest.spyOn(learningRepository, 'getActiveExperiments').mockResolvedValue([]);
      jest.spyOn(learningRepository, 'recordStrategyRun').mockResolvedValue({} as any);

      const decision = await strategyAgent.planNextShort('test-slot-1');

      expect(decision.format).toBeDefined();
      expect(decision.hookStyle).toBeDefined();
      expect(decision.visualTheme).toBeDefined();
      expect(decision.rationale).toContain('Selected');
    });
  });

  describe('PerformanceAnalyst', () => {
    it('should assign performance classes and derive insights from snapshot percentiles', async () => {
      const mockShorts: any[] = [
        {
          id: 's1',
          title: 'Viral AI Tool',
          format: 'DEMONSTRATION',
          hookStyle: 'RESULT_FIRST',
          performanceSnapshots: [{ views: 10000, avgPercentageViewed: 110, viewedVsSwiped: 85 }],
        },
        {
          id: 's2',
          title: 'Average Short',
          format: 'TOOL_DISCOVERY',
          hookStyle: 'CURIOSITY_GAP',
          performanceSnapshots: [{ views: 1500, avgPercentageViewed: 65, viewedVsSwiped: 60 }],
        },
        {
          id: 's3',
          title: 'Below Avg Short',
          format: 'AI_NEWS',
          hookStyle: 'CONTRARIAN',
          performanceSnapshots: [{ views: 200, avgPercentageViewed: 40, viewedVsSwiped: 45 }],
        },
      ];

      jest.spyOn(shortRepository, 'listUploadedForAnalysis').mockResolvedValue(mockShorts);
      jest.spyOn(shortRepository, 'update').mockResolvedValue({} as any);
      const saveInsightSpy = jest.spyOn(learningRepository, 'saveInsight').mockResolvedValue({} as any);

      const analysis = await performanceAnalyst.analyzeChannelPerformance();

      expect(analysis.analyzedCount).toBe(3);
      expect(analysis.topPerformerTitles).toContain('Viral AI Tool');
    });
  });
});
