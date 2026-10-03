import { ResearchResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export interface TrendAnalysisResult {
  topic: ResearchResult;
  trendScore: number;       // 0 to 100
  sourceCount: number;      // How many sources covered this or similar topic
  extractedEntity?: string; // e.g. "Cursor", "Claude", "OpenAI"
}

export class TrendDetector {
  private static KNOWN_ENTITIES = [
    'OpenAI', 'ChatGPT', 'GPT-4o', 'GPT-5', 'Anthropic', 'Claude', 'Google', 'Gemini',
    'DeepSeek', 'Meta', 'Llama', 'Mistral', 'Cursor', 'Windsurf', 'Devin', 'GitHub Copilot',
    'Midjourney', 'Flux', 'Stable Diffusion', 'Runway', 'Sora', 'Kling', 'Luma', 'Pika',
    'ElevenLabs', 'Perplexity', 'v0', 'Lovable', 'Bolt', 'Replit', 'Notion AI', 'Canva AI',
    'Apple Intelligence', 'Hugging Face', 'Ollama', 'Groq', 'LangChain', 'CrewAI'
  ];

  /**
   * Analyzes an array of candidate topics to detect cross-source trends,
   * keyword clustering, and velocity.
   */
  detectTrends(topics: ResearchResult[]): TrendAnalysisResult[] {
    logger.debug(`[TrendDetector] Analyzing trends across ${topics.length} candidate items`);

    // 1. Build term / entity frequency map
    const entityFrequency: Map<string, number> = new Map();
    const normalizedTitles: string[] = topics.map(t => t.title.toLowerCase());

    for (const entity of TrendDetector.KNOWN_ENTITIES) {
      const lower = entity.toLowerCase();
      let count = 0;
      for (const title of normalizedTitles) {
        if (title.includes(lower)) {
          count++;
        }
      }
      if (count > 0) {
        entityFrequency.set(entity, count);
      }
    }

    // 2. Score each topic based on recency, multi-source presence, and high-velocity entities
    return topics.map(topic => {
      const titleLower = topic.title.toLowerCase();
      const summaryLower = (topic.summary || '').toLowerCase();

      let matchedEntity: string | undefined;
      let maxEntityFreq = 1;

      for (const [entity, freq] of entityFrequency.entries()) {
        const lower = entity.toLowerCase();
        if (titleLower.includes(lower) || summaryLower.includes(lower)) {
          if (!matchedEntity || freq > maxEntityFreq) {
            matchedEntity = entity;
            maxEntityFreq = freq;
          }
        }
      }

      // Base trend score from cross-source frequency (capped at 5 mentions)
      // 1 source: 40, 2 sources: 65, 3 sources: 80, 4+ sources: 95
      let baseTrend = Math.min(40 + (maxEntityFreq - 1) * 20, 95);

      // Velocity bonus if high-impact viral tech keyword is present
      const viralKeywords = ['launch', 'breakthrough', 'new feature', 'released', 'free', 'agent', 'automate', 'update', 'game-changer'];
      let keywordBonus = 0;
      for (const kw of viralKeywords) {
        if (titleLower.includes(kw) || summaryLower.includes(kw)) {
          keywordBonus += 5;
        }
      }
      baseTrend = Math.min(baseTrend + keywordBonus, 100);

      // Freshness decay: if published more than 48 hours ago, reduce trend score
      if (topic.publishedAt) {
        const hoursAgo = (Date.now() - topic.publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 48) {
          baseTrend = Math.max(20, baseTrend - 25);
        } else if (hoursAgo > 24) {
          baseTrend = Math.max(35, baseTrend - 10);
        }
      }

      return {
        topic,
        trendScore: Math.round(baseTrend),
        sourceCount: maxEntityFreq,
        extractedEntity: matchedEntity,
      };
    });
  }
}

export const trendDetector = new TrendDetector();
