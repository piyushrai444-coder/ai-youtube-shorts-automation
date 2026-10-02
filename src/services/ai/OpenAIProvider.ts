import OpenAI from 'openai';
import { LLMProvider, ScriptInput, GeneratedScript, ResearchResult } from './LLMProvider.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAIProvider';
  private client: OpenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.llm.apiKey;
    if (key) {
      this.client = new OpenAI({ apiKey: key });
    }
    this.modelName = modelName || config.llm.model || 'gpt-4o-mini';
  }

  async selectBestTopic(topics: ResearchResult[]): Promise<ResearchResult> {
    if (topics.length === 0) {
      throw new Error('No topics available for selection');
    }
    if (topics.length === 1 || !this.client) {
      return topics[0];
    }

    try {
      const prompt = `You are a YouTube Shorts producer specializing in AI news and tools.
Select the single most engaging and useful topic for a 30s Short.

Topics:
${topics.map((t, idx) => `[${idx}] ${t.title} - ${t.summary.slice(0, 150)}`).join('\n')}

Reply with just the chosen index inside brackets, e.g. [0].`;

      const res = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const text = res.choices[0]?.message?.content || '';
      const match = text.match(/\[(\d+)\]/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx >= 0 && idx < topics.length) {
          return topics[idx];
        }
      }
    } catch (err: any) {
      logger.warn(`OpenAI selectBestTopic failed: ${err.message}`);
    }

    return topics[0];
  }

  async generateScript(input: ScriptInput): Promise<GeneratedScript> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
    }

    const cta = input.defaultCta || config.branding.defaultCta;
    const channelName = input.channelName || config.branding.channelName;

    const systemPrompt = `You are a YouTube Shorts scriptwriter for "${channelName}".
You produce punchy, 30-second scripts about groundbreaking AI tools.
Constraints:
- Word count: 55 to 75 words total. Never exceed 80 words.
- Structure: hook (8-15 words), explanation (25-35 words), benefit (15-20 words), cta (5-8 words).
- Accurate, no fabricated claims.
- Return ONLY valid JSON format with keys: title, hook, explanation, benefit, cta, tags, description.`;

    const userPrompt = `Topic: ${input.topicTitle}
Source: ${input.source} (${input.sourceUrl})
Summary: ${input.summary}
Category: ${input.category}`;

    const res = await this.client.chat.completions.create({
      model: this.modelName,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = res.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const fullScript = `${parsed.hook} ${parsed.explanation} ${parsed.benefit} ${parsed.cta}`.trim();
    const words = fullScript.split(/\s+/).filter(Boolean);
    const estimatedDurationSeconds = Math.round((words.length / 2.6) * 10) / 10;

    return {
      title: parsed.title,
      hook: parsed.hook,
      explanation: parsed.explanation,
      benefit: parsed.benefit,
      cta: parsed.cta,
      fullScript,
      estimatedDurationSeconds,
      wordCount: words.length,
      tags: parsed.tags || ['AI', 'Tech', 'AITools'],
      description: parsed.description || `${parsed.title}\n\nSource: ${input.sourceUrl}\n\n${cta}`,
      category: input.category,
    };
  }
}
