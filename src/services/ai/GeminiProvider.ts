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

    const prompt = `You are a world-class viral YouTube Shorts creator and algorithm strategist for the channel "${channelName}".
Your mission is to maximize two critical YouTube Shorts metrics:
1. "Viewed vs Swiped Away" (Hook retention in the first 2 seconds)
2. "Average Percentage Viewed" (Aiming for >100% completion via a Seamless Infinite Loop)

STRICT SCRIPT RULES:
1. TOTAL SPOKEN WORDS: MUST be between 58 and 72 words (ideal 23-26 seconds video length). Never exceed 76 words.
2. HOOK (8-14 words): Use one of these proven viral pattern interrupts:
   - "Stop using [X] until you see this new AI tool..."
   - "This brand new AI tool feels completely illegal to know..."
   - "Nobody is talking about how this new AI does [X] in seconds..."
   - "If you want to 10x your productivity today, watch this..."
3. EXPLANATION (22-30 words):
   - Explain the core superpower simply, clearly, with zero fluff or boring intro. What does it solve?
4. BENEFIT (14-18 words):
   - Tangible, jaw-dropping payoff: hours saved, workflows automated, or free access.
5. CTA + SEAMLESS INFINITE LOOP (12-16 words):
   - Spark comment engagement by asking a question (e.g. "Would you use this? Comment below!").
   - Crucial: End with a transition phrase that connects syntactically into your hook when the video loops back! (e.g. "...which is why everyone is checking out..." or "...and that is why you should...").
6. TITLE:
   - High CTR, emotional urgency, caps for emphasis, 1 emoji, followed by #Shorts (e.g. "This New AI Tool Feels ILLEGAL To Know 🤯 #Shorts").
7. TAGS: 6 high-ranking viral tags including "AI", "AITools", "Shorts", "TechHacks", "Productivity".
8. DESCRIPTION:
   - Punchy summary, source link credit: ${input.sourceUrl}, and pinned comment call to action.

RESEARCHED TOPIC:
Title: ${input.topicTitle}
Source: ${input.source} (${input.sourceUrl})
Summary: ${input.summary}
Category: ${input.category}

Return ONLY a JSON object matching this schema:
{
  "title": "Viral high-CTR title with emoji #Shorts",
  "hook": "Hook sentence with pattern interrupt",
  "explanation": "Core superpower explanation",
  "benefit": "Tangible benefit and payoff",
  "cta": "Engaging question and loop transition back to hook",
  "tags": ["AI", "AITools", "Tech", "Productivity", "Shorts"],
  "description": "Short description with hashtags and credit to ${input.sourceUrl}"
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
