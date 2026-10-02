import { ResearchProvider, ResearchResult } from '../../types/index.js';
import { RssResearchProvider, rssResearchProvider } from './RssResearchProvider.js';
import { SearchApiProvider, searchApiProvider } from './SearchApiProvider.js';
import { topicRepository } from '../../repositories/TopicRepository.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class ResearchService {
  private providers: ResearchProvider[];

  constructor(providers?: ResearchProvider[]) {
    if (providers && providers.length > 0) {
      this.providers = providers;
    } else {
      // Configure default provider cascade based on config
      const primary = config.research.provider;
      if (primary === 'searchapi' && config.research.searchApiKey) {
        this.providers = [searchApiProvider, rssResearchProvider];
      } else {
        this.providers = [rssResearchProvider, searchApiProvider];
      }
    }
  }

  async discoverTopics(query?: string, categoryFilter?: string, jobId?: string): Promise<ResearchResult[]> {
    logger.job(jobId || 'sys', `Research started with ${this.providers.length} providers`);
    const allDiscovered: ResearchResult[] = [];

    for (const provider of this.providers) {
      try {
        logger.job(jobId || 'sys', `Running research provider: ${provider.name}`);
        const items = await provider.search(query, categoryFilter);
        logger.job(jobId || 'sys', `Provider ${provider.name} found ${items.length} items`);
        allDiscovered.push(...items);
      } catch (err: any) {
        logger.warn(`Provider ${provider.name} failed: ${err.message}`, undefined, jobId);
      }
    }

    if (allDiscovered.length === 0) {
      logger.warn('No items found from live providers, checking unused database topics', undefined, jobId);
      const existing = await topicRepository.findUnused(10);
      return existing.map(t => ({
        title: t.title,
        source: t.source,
        sourceUrl: t.sourceUrl,
        publishedAt: t.publishedAt || t.discoveredAt,
        summary: t.summary,
        category: t.category,
        score: t.score,
        contentHash: t.contentHash,
      }));
    }

    // Deduplication & Filtering
    const uniqueCandidates: ResearchResult[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const item of allDiscovered) {
      const normalizedUrl = item.sourceUrl.trim().toLowerCase();
      const normalizedTitle = item.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
        continue;
      }
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);

      // Check database for duplicates
      const existingByHash = await topicRepository.findByHash(item.contentHash);
      if (existingByHash) {
        continue;
      }

      const existingByUrl = await topicRepository.findBySourceUrl(item.sourceUrl);
      if (existingByUrl) {
        continue;
      }

      // Save fresh candidate to DB
      try {
        await topicRepository.create(item);
        uniqueCandidates.push(item);
      } catch (err: any) {
        logger.debug(`Could not save topic (likely race duplicate): ${err.message}`);
      }
    }

    logger.job(jobId || 'sys', `Research completed: ${uniqueCandidates.length} new unique topics added`);
    return uniqueCandidates;
  }
}

export const researchService = new ResearchService();
