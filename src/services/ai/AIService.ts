import { LLMProvider, ScriptInput, GeneratedScript, ResearchResult } from './LLMProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { QualityChecker } from './QualityChecker.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

import { settingRepository } from '../../repositories/SettingRepository.js';

export class AIService {
  private customProvider?: LLMProvider;

  constructor(customProvider?: LLMProvider) {
    if (customProvider) {
      this.customProvider = customProvider;
    }
  }

  async getEffectiveProvider(): Promise<LLMProvider> {
    if (this.customProvider) {
      return this.customProvider;
    }
    const dbProvider = await settingRepository.get('llm_provider');
    const dbModel = await settingRepository.get('llm_model');
    const dbKey = await settingRepository.getSecure('llm_api_key');

    const providerType = (dbProvider || config.llm.provider || 'gemini').toLowerCase();
    const apiKey = dbKey || config.llm.apiKey;
    const model = dbModel || config.llm.model;

    if (providerType === 'openai') {
      return new OpenAIProvider(apiKey, model);
    } else {
      return new GeminiProvider(apiKey, model);
    }
  }

  getProviderName(): string {
    return this.customProvider?.name || config.llm.provider;
  }

  async selectBestTopic(topics: ResearchResult[], jobId?: string): Promise<ResearchResult> {
    const provider = await this.getEffectiveProvider();
    logger.job(jobId || 'sys', `Selecting best topic from ${topics.length} candidates using ${provider.name}`);
    return provider.selectBestTopic(topics);
  }

  async generateAndValidateScript(input: ScriptInput, jobId?: string): Promise<GeneratedScript> {
    const provider = await this.getEffectiveProvider();
    logger.job(jobId || 'sys', `Generating YouTube Short script for "${input.topicTitle}" using ${provider.name}`);

    let attempts = 0;
    const maxAttempts = 3;
    let lastScript: GeneratedScript | null = null;
    let lastErrors: string[] = [];

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const script = await provider.generateScript(input);
        lastScript = script;

        const validation = QualityChecker.validate(script);
        if (validation.isValid) {
          logger.job(
            jobId || 'sys',
            `Script passed quality checks (${validation.wordCount} words, est. ${validation.estimatedDurationSeconds}s)`
          );
          return script;
        }

        logger.warn(
          `Script validation failed (attempt ${attempts}/${maxAttempts}): ${validation.errors.join('; ')}`,
          undefined,
          jobId
        );
        lastErrors = validation.errors;

        // If the script was too long, adjust target in input for next attempt
        if (validation.wordCount > QualityChecker.MAX_WORDS) {
          input.targetDurationSeconds = 24;
        }
      } catch (err: any) {
        logger.error(`Script generation error (attempt ${attempts}): ${err.message}`, undefined, jobId);
        if (attempts >= maxAttempts) throw err;
      }
    }

    if (lastScript) {
      // Automatic fallback repair: shorten script to fit within 30s
      logger.job(jobId || 'sys', 'Auto-repairing script to ensure <= 30s compliance');
      return this.repairScript(lastScript, input);
    }

    throw new Error(`Failed to generate valid script after ${maxAttempts} attempts: ${lastErrors.join('; ')}`);
  }

  private repairScript(script: GeneratedScript, input: ScriptInput): GeneratedScript {
    // Truncate explanation or benefit to keep words under 75
    const hookWords = script.hook.split(/\s+/).filter(Boolean);
    const explanationWords = script.explanation.split(/\s+/).filter(Boolean).slice(0, 30);
    const benefitWords = script.benefit.split(/\s+/).filter(Boolean).slice(0, 18);
    const ctaWords = script.cta.split(/\s+/).filter(Boolean).slice(0, 8);

    const repairedHook = hookWords.join(' ');
    const repairedExplanation = explanationWords.join(' ');
    const repairedBenefit = benefitWords.join(' ');
    const repairedCta = ctaWords.join(' ');

    const fullScript = `${repairedHook} ${repairedExplanation} ${repairedBenefit} ${repairedCta}`;
    const wordCount = fullScript.split(/\s+/).length;
    const estimatedDurationSeconds = Math.round((wordCount / 2.6) * 10) / 10;

    return {
      ...script,
      hook: repairedHook,
      explanation: repairedExplanation,
      benefit: repairedBenefit,
      cta: repairedCta,
      fullScript,
      wordCount,
      estimatedDurationSeconds,
    };
  }
}

export const aiService = new AIService();
