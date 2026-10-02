import axios from 'axios';
import { ResearchProvider, ResearchResult } from '../../types/index.js';
import { hashContent } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class SearchApiProvider implements ResearchProvider {
  name = 'SearchApiProvider';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.research.searchApiKey;
  }

  async search(query: string = 'latest AI tools launch 2026', category?: string): Promise<ResearchResult[]> {
    if (!this.apiKey) {
      logger.debug('SearchApiProvider: No SEARCH_API_KEY configured, skipping search API');
      return [];
    }

    try {
      // Supports Tavily or Serper style search endpoint
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.apiKey,
          query: `${query} useful AI tools updates`,
          search_depth: 'basic',
          include_answer: false,
          max_results: 10,
        },
        { timeout: 8000 }
      );

      const items = response.data?.results || [];
      const results: ResearchResult[] = [];

      for (const item of items) {
        if (!item.title || !item.url) continue;
        results.push({
          title: item.title,
          source: 'Web Search',
          sourceUrl: item.url,
          summary: item.content ? item.content.slice(0, 500) : item.title,
          category: category || 'AI Tools',
          publishedAt: item.published_date ? new Date(item.published_date) : new Date(),
          score: 12,
          contentHash: hashContent(`${item.title}::${item.url}`),
        });
      }

      return results;
    } catch (err: any) {
      logger.warn(`SearchApiProvider failed: ${err?.message || err}`);
      return [];
    }
  }
}

export const searchApiProvider = new SearchApiProvider();
