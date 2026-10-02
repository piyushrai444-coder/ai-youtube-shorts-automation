import fs from 'fs';
import path from 'path';
import os from 'os';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { CanvasVisualProvider, canvasVisualProvider } from './CanvasVisualProvider.js';
import { GeneratedScript } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class VisualService {
  private provider: VisualProvider;

  constructor(customProvider?: VisualProvider) {
    this.provider = customProvider || canvasVisualProvider;
  }

  async generateScenes(
    script: GeneratedScript,
    totalDurationSeconds: number,
    jobId?: string
  ): Promise<{ sceneImages: { imagePath: string; duration: number }[]; tempDir: string }> {
    logger.job(jobId || 'sys', `Generating 4 vertical visuals for ${totalDurationSeconds.toFixed(2)}s video using ${this.provider.name}`);

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
        headline: 'Core Capabilities',
        bodyText: script.explanation,
        category: script.category,
        durationSeconds: explDur,
      },
      {
        index: 2,
        type: 'benefit',
        headline: 'Why It Matters',
        bodyText: script.benefit,
        category: script.category,
        durationSeconds: benefitDur,
      },
      {
        index: 3,
        type: 'cta',
        headline: 'Stay Ahead in AI',
        bodyText: script.cta,
        category: script.category,
        durationSeconds: ctaDur,
      },
    ];

    const results = await this.provider.generateVisuals(scenes);

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
