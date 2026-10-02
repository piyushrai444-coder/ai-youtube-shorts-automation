import { QualityChecker } from '../src/services/ai/QualityChecker';
import { AIService } from '../src/services/ai/AIService';
import { GeneratedScript } from '../src/types';

describe('AI Content Generation & Quality Rules', () => {
  describe('QualityChecker Validation', () => {
    it('should validate a compliant 30-second script (65 words)', () => {
      const validScript: GeneratedScript = {
        title: 'This AI Tool Can Build Full Websites in Minutes 🤯',
        hook: 'Did you know this new AI tool can build complete web applications from just one sentence?',
        explanation: 'It automatically designs responsive layouts, writes clean backend code, and deploys directly to production with zero setup required.',
        benefit: 'It cuts down full-stack development time from weeks to minutes, letting developers ship faster than ever.',
        cta: 'Follow for more breakthrough AI tools and daily updates 🚀',
        fullScript:
          'Did you know this new AI tool can build complete web applications from just one sentence? It automatically designs responsive layouts, writes clean backend code, and deploys directly to production with zero setup required. It cuts down full-stack development time from weeks to minutes, letting developers ship faster than ever. Follow for more breakthrough AI tools and daily updates 🚀',
        estimatedDurationSeconds: 24.5,
        wordCount: 64,
        tags: ['AI', 'Tech', 'AITools'],
        description: 'New AI tool builds websites in minutes.',
        category: 'AI Tools',
      };

      const result = QualityChecker.validate(validScript);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(30);
    });

    it('should reject a script that exceeds 30 seconds limit (over 80 words)', () => {
      const longWords = Array(95).fill('word').join(' ');
      const longScript: GeneratedScript = {
        title: 'Overly Long Script Test',
        hook: 'This is the hook sentence for the test.',
        explanation: longWords,
        benefit: 'This is the benefit sentence.',
        cta: 'Follow for more tools.',
        fullScript: `This is the hook sentence. ${longWords} This is the benefit. Follow for more tools.`,
        estimatedDurationSeconds: 40.0,
        wordCount: 105,
        tags: ['AI'],
        description: 'Desc',
        category: 'AI Tools',
      };

      const result = QualityChecker.validate(longScript);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('30s limit') || e.includes('exceeds maximum allowed'))).toBe(true);
    });

    it('should reject a script with missing structural components', () => {
      const incompleteScript: GeneratedScript = {
        title: 'Missing Pieces',
        hook: '', // Missing hook
        explanation: 'Some explanation text here.',
        benefit: '',
        cta: 'Follow us',
        fullScript: 'Some explanation text here. Follow us',
        estimatedDurationSeconds: 10,
        wordCount: 8,
        tags: [],
        description: '',
        category: 'AI Tools',
      };

      const result = QualityChecker.validate(incompleteScript);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Hook'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Benefit'))).toBe(true);
    });

    it('should reject scripts containing deceptive clickbait claims', () => {
      const deceptiveScript: GeneratedScript = {
        title: 'Get Rich Fast With AI',
        hook: 'Here is a guaranteed millionaire secret with this new AI!',
        explanation: 'This tool generates unlimited cash on autopilot.',
        benefit: 'Instant wealth with zero effort.',
        cta: 'Follow for more money tricks.',
        fullScript: 'Here is a guaranteed millionaire secret with this new AI! This tool generates cash. Follow for more.',
        estimatedDurationSeconds: 20,
        wordCount: 20,
        tags: ['AI'],
        description: '',
        category: 'AI Tools',
      };

      const result = QualityChecker.validate(deceptiveScript);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('guaranteed millionaire'))).toBe(true);
    });
  });

  describe('AIService Auto-Repair Logic', () => {
    it('should auto-repair and truncate script if generator produces slightly wordy output', async () => {
      const mockLLM = {
        name: 'MockLLM',
        selectBestTopic: jest.fn(),
        generateScript: jest.fn().mockImplementation(async () => {
          const hook = 'Did you know that this new AI tool is capable of astonishing things?';
          const explanation = Array(45).fill('capability').join(' ');
          const benefit = Array(25).fill('advantage').join(' ');
          const cta = 'Follow for more awesome daily updates right now!';
          const fullScript = `${hook} ${explanation} ${benefit} ${cta}`;
          return {
            title: 'Wordy Script Example That Exceeds Word Limits',
            hook,
            explanation,
            benefit,
            cta,
            fullScript,
            estimatedDurationSeconds: 34.0,
            wordCount: 88,
            tags: ['AI'],
            description: 'Desc',
            category: 'AI Tools',
          };
        }),
      };

      const service = new AIService(mockLLM as any);
      const repaired = await service.generateAndValidateScript({
        topicTitle: 'Test AI Tool',
        summary: 'Summary',
        sourceUrl: 'https://example.com',
        source: 'Source',
        category: 'AI Tools',
      });

      expect(repaired.estimatedDurationSeconds).toBeLessThanOrEqual(30);
      expect(repaired.wordCount).toBeLessThanOrEqual(80);
    });
  });
});
