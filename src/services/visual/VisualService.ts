import fs from 'fs';
import path from 'path';
import os from 'os';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { CanvasVisualProvider, canvasVisualProvider } from './CanvasVisualProvider.js';
import { PollinationsVisualProvider, pollinationsVisualProvider } from './PollinationsVisualProvider.js';
import { GeneratedScript } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { settingRepository } from '../../repositories/SettingRepository.js';

export class VisualService {
  private customProvider?: VisualProvider;

  constructor(customProvider?: VisualProvider) {
    this.customProvider = customProvider;
  }

  async getEffectiveProvider(): Promise<VisualProvider> {
    if (this.customProvider) return this.customProvider;
    const dbProvider = await settingRepository.get('visual_provider');
    const providerName = (dbProvider || config.visual.provider || 'pollinations').toLowerCase();
    if (providerName === 'canvas') {
      return canvasVisualProvider;
    }
    return pollinationsVisualProvider;
  }

  async generateScenes(
    script: GeneratedScript,
    totalDurationSeconds: number,
    jobId?: string
  ): Promise<{ sceneImages: { imagePath: string; duration: number }[]; tempDir: string }> {
    const provider = await this.getEffectiveProvider();
    logger.job(jobId || 'sys', `Generating 4 vertical visuals for ${totalDurationSeconds.toFixed(2)}s video using ${provider.name}`);

    // Calculate word counts to distribute scene durations accurately
    const hookWords = script.hook.split(/\s+/).length;
    const explanationWords = script.explanation.split(/\s+/).length;
    const benefitWords = script.benefit.split(/\s+/).length;
    const ctaWords = script.cta.split(/\s+/).length;
    const totalWords = hookWords + explanationWords + benefitWords + ctaWords || 1;

    const hookDur = Math.max(3.0, (hookWords / totalWords) * totalDurationSeconds);
    const explDur = Math.max(7.0, (explanationWords / totalWords) * totalDurationSeconds);
    const benefitDur = Math.max(5.0, (benefitWords / totalWords) * totalDurationSeconds);
    // CTA takes remainder to ensure exact sum equals totalDurationSeconds
    const ctaDur = Math.max(3.0, totalDurationSeconds - (hookDur + explDur + benefitDur));

    const format = script.format || 'TOOL_DISCOVERY';
    let h1 = 'Core Capabilities';
    let h2 = 'Why It Matters';
    let h3 = 'Stay Ahead in AI';

    if (format === 'DEMONSTRATION') {
      h1 = '⚡ Live Demonstration';
      h2 = '🔮 Real-Time Results';
      h3 = '🚀 Try This Prompt';
    } else if (format === 'PROBLEM_SOLUTION') {
      h1 = '🛑 The Old Problem';
      h2 = '✅ The AI Solution';
      h3 = '⚡ Automate It Today';
    } else if (format === 'COMPARISON') {
      h1 = '⚔️ Side-by-Side Test';
      h2 = '🏆 The Real Winner';
      h3 = '💬 What Do You Think?';
    } else if (format === 'HIDDEN_FEATURE') {
      h1 = '🔓 Secret Feature';
      h2 = '💡 Unfair Advantage';
      h3 = '🔥 Don’t Miss Out';
    } else if (format === 'BEFORE_AFTER') {
      h1 = '⏳ Before vs After';
      h2 = '📈 10x Speed Difference';
      h3 = '🔗 Link in Description';
    }

    const scenes: VisualScene[] = [
      {
        index: 0,
        type: 'hook',
        headline: script.title,
        bodyText: script.hook,
        category: script.category,
        durationSeconds: hookDur,
      },
      {
        index: 1,
        type: 'explanation',
        headline: h1,
        bodyText: script.explanation,
        category: script.category,
        durationSeconds: explDur,
      },
      {
        index: 2,
        type: 'benefit',
        headline: h2,
        bodyText: script.benefit,
        category: script.category,
        durationSeconds: benefitDur,
      },
      {
        index: 3,
        type: 'cta',
        headline: h3,
        bodyText: script.cta,
        category: script.category,
        durationSeconds: ctaDur,
      },
    ];

    const results = await provider.generateVisuals(scenes);

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yt_scenes_'));
    const sceneImages: { imagePath: string; duration: number }[] = [];

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const filePath = path.join(tempDir, `scene_${res.sceneIndex}.png`);
      await fs.promises.writeFile(filePath, res.imageBuffer);
      sceneImages.push({
        imagePath: filePath,
        duration: res.durationSeconds,
      });
    }

    logger.job(jobId || 'sys', `Generated ${sceneImages.length} scene visuals in ${tempDir}`);
    return { sceneImages, tempDir };
  }
}

export const visualService = new VisualService();
