import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { ResearchProvider, ResearchResult } from '../../types/index.js';
import { hashContent } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

interface RssFeedSource {
  name: string;
  url: string;
  defaultCategory: string;
  isOfficial: boolean;
}

export class RssResearchProvider implements ResearchProvider {
  name = 'RssResearchProvider';
  private parser: Parser;

  private feeds: RssFeedSource[] = [
    {
      name: 'Hacker News AI',
      url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+Claude+OR+Gemini+OR+OpenAI&points=20',
      defaultCategory: 'AI Tools',
      isOfficial: false,
    },
    {
      name: 'TechCrunch AI',
      url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
      defaultCategory: 'AI News',
      isOfficial: false,
    },
    {
      name: 'The Verge AI',
      url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
      defaultCategory: 'AI News',
      isOfficial: false,
    },
    {
      name: 'Google AI Blog',
      url: 'https://blog.google/technology/ai/rss/',
      defaultCategory: 'AI Research',
      isOfficial: true,
    },
    {
      name: 'OpenAI News',
      url: 'https://openai.com/news/rss.xml',
      defaultCategory: 'AI Updates',
      isOfficial: true,
    },
    {
      name: 'Ars Technica AI',
      url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
      defaultCategory: 'AI Tools',
      isOfficial: false,
    },
  ];

  constructor(customFeeds?: RssFeedSource[]) {
    this.parser = new Parser({
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (customFeeds && customFeeds.length > 0) {
      this.feeds = customFeeds;
    }
  }

  async search(query?: string, categoryFilter?: string): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    for (const feed of this.feeds) {
      try {
        logger.debug(`Fetching RSS feed: ${feed.name} from ${feed.url}`);
        const parsed = await this.parser.parseURL(feed.url);
        const recentItems = (parsed.items || []).slice(0, 15);
        for (const item of recentItems) {
          if (!item.title || !item.link) continue;

          // Strip HTML from content or snippet
          const rawText = item.contentSnippet || item.content || item.summary || '';
          const cleanSummary = this.cleanText(rawText);

          if (cleanSummary.length < 20 && (!item.title || item.title.length < 10)) {
            continue;
          }

          // Filter by query if specified
          if (query) {
            const lowerQuery = query.toLowerCase();
            const matchesTitle = item.title.toLowerCase().includes(lowerQuery);
            const matchesSummary = cleanSummary.toLowerCase().includes(lowerQuery);
            if (!matchesTitle && !matchesSummary) continue;
          }

          const category = this.categorizeTopic(item.title, cleanSummary, feed.defaultCategory);
          if (categoryFilter && categoryFilter !== 'all' && categoryFilter !== 'AI Tools' && category.toLowerCase() !== categoryFilter.toLowerCase()) {
            continue;
          }

          const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();
          const contentHash = hashContent(`${item.title}::${item.link}`);

          // Score priority (official feeds get a bonus, newer items get a bonus)
          let score = feed.isOfficial ? 15 : 10;
          const ageHours = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
          if (ageHours < 24) score += 10;
          else if (ageHours < 72) score += 5;

          results.push({
            title: item.title.trim(),
            source: feed.name,
            sourceUrl: item.link.trim(),
            publishedAt: publishedDate,
            summary: cleanSummary.slice(0, 500),
            category,
            score,
            contentHash,
          });
        }
      } catch (err: any) {
        logger.warn(`Failed to parse RSS feed ${feed.name}: ${err?.message || err}`);
      }
    }

    return results;
  }

  private cleanText(rawHtml: string): string {
    if (!rawHtml) return '';
    try {
      const $ = cheerio.load(rawHtml);
      return $.text().replace(/\s+/g, ' ').trim();
    } catch {
      return rawHtml.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    }
  }

  private categorizeTopic(title: string, summary: string, fallback: string): string {
    const text = `${title} ${summary}`.toLowerCase();
    if (text.includes('code') || text.includes('coding') || text.includes('developer') || text.includes('github') || text.includes('sdk')) {
      return 'AI Coding';
    }
    if (text.includes('productivity') || text.includes('workflow') || text.includes('notion') || text.includes('automation')) {
      return 'AI Productivity';
    }
    if (text.includes('video') || text.includes('sora') || text.includes('runway') || text.includes('pika')) {
      return 'AI Video';
    }
    if (text.includes('image') || text.includes('midjourney') || text.includes('dall-e') || text.includes('flux')) {
      return 'AI Image Generation';
    }
    if (text.includes('agent') || text.includes('autonomous') || text.includes('crewai')) {
      return 'AI Agents';
    }
    if (text.includes('website') || text.includes('tool') || text.includes('launch') || text.includes('app')) {
      return 'AI Tools';
    }
    return fallback;
  }
}

export const rssResearchProvider = new RssResearchProvider();
