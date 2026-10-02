import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ScriptInput, GeneratedScript, ResearchResult } from './LLMProvider.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export class GeminiProvider implements LLMProvider {
  name = 'GeminiProvider';
  private client: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.llm.apiKey;
    if (key) {
      this.client = new GoogleGenerativeAI(key);
    }
    this.modelName = modelName || config.llm.model || 'gemini-3.5-flash-lite';
  }

  async selectBestTopic(topics: ResearchResult[]): Promise<ResearchResult> {
    if (topics.length === 0) {
      throw new Error('No topics available for selection');
    }
    if (topics.length === 1 || !this.client) {
      return topics[0];
    }

    const candidateModels = [
      this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const modelToTry of candidateModels) {
      try {
        const model = this.client.getGenerativeModel({ model: modelToTry });
        const prompt = `You are a viral YouTube Shorts producer specializing in AI tools and technology.
Select the SINGLE best, most practical and interesting topic from this list for a 30-second YouTube Short.

Criteria:
1. Freshness and genuine utility to developers, creators, or knowledge workers.
2. Backed by real technology (no vague rumors or clickbait).
3. Easily explained within 30 seconds.

Candidates:
${topics.map((t, idx) => `[${idx}] Title: ${t.title} | Source: ${t.source} | Summary: ${t.summary}`).join('\n\n')}

Respond with ONLY the integer index of the selected topic inside brackets like [0].`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\[(\d+)\]/);
        if (match) {
          const index = parseInt(match[1], 10);
          if (index >= 0 && index < topics.length) {
            logger.info(`Gemini (${modelToTry}) selected topic index ${index}: "${topics[index].title}"`);
            return topics[index];
          }
        }
      } catch (err: any) {
        logger.warn(`Gemini selectBestTopic with "${modelToTry}" failed: ${err.message}. Trying next model...`);
      }
    }

    return topics[0];
  }

  async generateScript(input: ScriptInput): Promise<GeneratedScript> {
    if (!this.client) {
      throw new Error('Gemini API key is not configured');
    }

    const cta = input.defaultCta || config.branding.defaultCta;
    const channelName = input.channelName || config.branding.channelName;

    const prompt = `You are an elite YouTube Shorts scriptwriter for the channel "${channelName}".
Transform this researched AI news/tool into a punchy, viral YouTube Short.

STRICT CONSTRAINTS:
1. TOTAL SPOKEN WORDS MUST BE BETWEEN 55 AND 75 WORDS. NEVER EXCEED 80 WORDS (Video must finish in 30 seconds or less).
2. STRUCTURE:
   - Hook (1 sentence, 8-15 words): Grab attention immediately with an astonishing fact or question.
   - Explanation (2-3 sentences, 25-35 words): What the tool does in simple, plain English.
   - Benefit (1-2 sentences, 15-20 words): Why it matters and how it saves time or supercharges productivity.
   - CTA (1 sentence, 5-8 words): Call to action like "${cta}".
3. FACTUALITY: Only state features supported by the source. No hallucinations, no fake stats.
4. TITLE: High CTR, under 65 characters, exciting with 1 emoji.
5. TAGS: 5 to 7 relevant tags.

RESEARCHED TOPIC:
Title: ${input.topicTitle}
Source: ${input.source} (${input.sourceUrl})
Summary: ${input.summary}
Category: ${input.category}

Return ONLY a JSON object matching this schema:
{
  "title": "Short title with emoji",
  "hook": "Hook sentence",
  "explanation": "Explanation sentences",
  "benefit": "Main benefit sentences",
  "cta": "CTA sentence",
  "tags": ["AI", "AITools", "Tech"],
  "description": "Short YouTube description with hashtags and source credit: ${input.sourceUrl}"
}`;

    const candidateModels = [
      this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;
    let text = '';

    for (const modelToTry of candidateModels) {
      try {
        const model = this.client.getGenerativeModel({
          model: modelToTry,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        const response = await model.generateContent(prompt);
        text = response.response.text();
        if (text) {
          logger.info(`Generated script successfully using model "${modelToTry}"`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        logger.warn(`Gemini generation with "${modelToTry}" failed (${err.message}). Trying fallback model...`);
      }
    }

    if (!text) {
      throw lastError || new Error('All Gemini candidate models failed to generate content');
    }

    const parsed = JSON.parse(text);
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
      description: parsed.description || `${parsed.title}\n\nSource: ${input.sourceUrl}\n\n${cta}\n\n#AI #AITools #Shorts`,
      category: input.category,
    };
  }
}
