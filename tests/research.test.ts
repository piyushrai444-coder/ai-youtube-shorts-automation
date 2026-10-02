import { RssResearchProvider } from '../src/services/research/RssResearchProvider';
import { ResearchService } from '../src/services/research/ResearchService';
import { topicRepository } from '../src/repositories/TopicRepository';
import { hashContent } from '../src/utils/crypto';

describe('Research Engine & Duplicate Detection', () => {
  describe('Content Hashing & Deduplication', () => {
    it('should generate identical hash for normalized variations of the same title', () => {
      const hash1 = hashContent('OpenAI Announces GPT-5 Tool!');
      const hash2 = hashContent('openai announces gpt-5 tool');
      const hash3 = hashContent('   OpenAI Announces GPT-5 Tool!   ');

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should generate different hash for distinct topics', () => {
      const hashA = hashContent('OpenAI Releases Sora API');
      const hashB = hashContent('Google DeepMind Introduces Gemini Flash');

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('Multi-Provider Fallback & Deduplication', () => {
    it('should fall back gracefully to secondary provider when primary fails', async () => {
      const mockFailingProvider = {
        name: 'MockFailing',
        search: jest.fn().mockRejectedValue(new Error('Network timeout')),
      };

      const mockWorkingProvider = {
        name: 'MockWorking',
        search: jest.fn().mockResolvedValue([
          {
            title: 'New AI Coding Assistant Released',
            source: 'Tech News',
            sourceUrl: 'https://example.com/ai-tool-1',
            summary: 'A revolutionary new AI tool for coders.',
            category: 'AI Coding',
            publishedAt: new Date(),
            contentHash: hashContent('New AI Coding Assistant Released'),
          },
        ]),
      };

      jest.spyOn(topicRepository, 'findByHash').mockResolvedValue(null);
      jest.spyOn(topicRepository, 'findBySourceUrl').mockResolvedValue(null);
      jest.spyOn(topicRepository, 'create').mockResolvedValue({ id: 't1' } as any);

      const researchService = new ResearchService([mockFailingProvider as any, mockWorkingProvider as any]);
      const results = await researchService.discoverTopics();

      expect(mockFailingProvider.search).toHaveBeenCalled();
      expect(mockWorkingProvider.search).toHaveBeenCalled();
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('New AI Coding Assistant Released');
    });

    it('should skip duplicate topic if already in database by hash or URL', async () => {
      const mockProvider = {
        name: 'MockProvider',
        search: jest.fn().mockResolvedValue([
          {
            title: 'Duplicate Topic',
            source: 'Blog',
            sourceUrl: 'https://example.com/duplicate',
            summary: 'Duplicate summary',
            category: 'AI News',
            publishedAt: new Date(),
            contentHash: hashContent('Duplicate Topic'),
          },
        ]),
      };

      // Mock DB finding existing topic
      jest.spyOn(topicRepository, 'findByHash').mockResolvedValue({ id: 'existing-id' } as any);

      const researchService = new ResearchService([mockProvider as any]);
      const results = await researchService.discoverTopics();

      expect(results.length).toBe(0);
    });
  });
});
