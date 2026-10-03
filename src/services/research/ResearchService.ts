import { ResearchProvider, ResearchResult } from '../../types/index.js';
import { RssResearchProvider, rssResearchProvider } from './RssResearchProvider.js';
import { SearchApiProvider, searchApiProvider } from './SearchApiProvider.js';
import { topicRepository } from '../../repositories/TopicRepository.js';
import { topicScorer } from './TopicScorer.js';
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
      } else if (config.research.searchApiKey) {
        this.providers = [rssResearchProvider, searchApiProvider];
      } else {
        this.providers = [rssResearchProvider];
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
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const dedupedPool: ResearchResult[] = [];

    for (const item of allDiscovered) {
      const normalizedUrl = item.sourceUrl.trim().toLowerCase();
      const normalizedTitle = item.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
        continue;
      }
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      dedupedPool.push(item);
    }

    // Step 2: Multi-Factor Topic Scoring (Freshness, Utility, Curiosity, Visual, Trend, Competition)
    logger.job(jobId || 'sys', `Scoring top ${Math.min(dedupedPool.length, 50)} candidate topics with multi-factor engine...`);
    const scoredCandidates = topicScorer.scoreTopics(dedupedPool.slice(0, 50));

    // Sort by finalScore descending
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    const uniqueCandidates: ResearchResult[] = [];

    for (const item of scoredCandidates) {
      // Check database for duplicates
      const existingByHash = await topicRepository.findByHash(item.contentHash);
      if (existingByHash) {
        if (existingByHash.used === false) {
          uniqueCandidates.push({
            title: existingByHash.title,
            source: existingByHash.source,
            sourceUrl: existingByHash.sourceUrl,
            publishedAt: existingByHash.publishedAt || existingByHash.discoveredAt,
            summary: existingByHash.summary,
            category: existingByHash.category,
            score: existingByHash.finalScore || existingByHash.score,
            contentHash: existingByHash.contentHash,
          });
        }
        continue;
      }

      const existingByUrl = await topicRepository.findBySourceUrl(item.sourceUrl);
      if (existingByUrl) {
        if (existingByUrl.used === false) {
          uniqueCandidates.push({
            title: existingByUrl.title,
            source: existingByUrl.source,
            sourceUrl: existingByUrl.sourceUrl,
            publishedAt: existingByUrl.publishedAt || existingByUrl.discoveredAt,
            summary: existingByUrl.summary,
            category: existingByUrl.category,
            score: existingByUrl.finalScore || existingByUrl.score,
            contentHash: existingByUrl.contentHash,
          });
        }
        continue;
      }

      // Save fresh scored candidate to DB
      try {
        await topicRepository.create(item);
        uniqueCandidates.push(item);
      } catch (err: any) {
        logger.debug(`Could not save topic (likely race duplicate): ${err.message}`);
      }
    }

    // If all candidates in current batch were already marked used, fetch any unused candidates from database
    if (uniqueCandidates.length === 0) {
      logger.job(jobId || 'sys', 'Querying unused candidate topics from database...');
      try {
        const unused = await topicRepository.findUnused(15, categoryFilter);
        if (unused && unused.length > 0) {
          for (const t of unused) {
            uniqueCandidates.push({
              title: t.title,
              source: t.source,
              sourceUrl: t.sourceUrl,
              publishedAt: t.publishedAt || t.discoveredAt,
              summary: t.summary,
              category: t.category,
              score: t.finalScore || t.score,
              contentHash: t.contentHash,
            });
          }
        }
      } catch (err: any) {
        logger.warn(`Could not fetch unused topics: ${err.message}`);
      }
    }

    logger.job(jobId || 'sys', `Research completed: ${uniqueCandidates.length} candidate topics available`);
    return uniqueCandidates;
  }
}

export const researchService = new ResearchService();
