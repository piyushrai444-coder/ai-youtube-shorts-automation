import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import sharp from 'sharp';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { canvasVisualProvider } from './CanvasVisualProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { settingRepository } from '../../repositories/SettingRepository.js';

export class PollinationsVisualProvider implements VisualProvider {
  name = 'PollinationsVisualProvider';

  private localAssetDir = path.resolve(process.cwd(), 'public/images/tech_3d');

  async generateVisuals(scenes: VisualScene[]): Promise<VisualResult[]> {
    logger.info(`[PollinationsVisualProvider] Generating ${scenes.length} 3D Pixar/Tech scenes with advanced UI/UX...`);

    const results: VisualResult[] = [];

    for (const scene of scenes) {
      try {
        const imageBuffer = await this.renderScene(scene, scenes.length);
        results.push({
          sceneIndex: scene.index,
          imageBuffer,
          durationSeconds: scene.durationSeconds,
        });
      } catch (err: any) {
        logger.warn(
          `[PollinationsVisualProvider] Scene ${scene.index} failed (${err.message}). Falling back to CanvasVisualProvider...`
        );
        const fallbackResults = await canvasVisualProvider.generateVisuals([scene]);
        if (fallbackResults.length > 0) {
          results.push(fallbackResults[0]);
        }
      }
    }

    return results;
  }

  /**
   * Renders a single 1080x1920 Short scene with 3D Pixar hero visual & glassmorphic UI.
   */
  private async renderScene(scene: VisualScene, totalScenes: number): Promise<Buffer> {
    // 1. Obtain Hero 3D Image (Pollinations AI -> Local 3D Asset -> Canvas Fallback)
    const rawImageBuffer = await this.getHeroImage(scene);

    // 2. Resize hero image to fit beautifully in viewport
    const heroWidth = 1000;
    const heroHeight = 960;
    const heroResized = await sharp(rawImageBuffer)
      .resize(heroWidth, heroHeight, { fit: 'cover', position: 'center' })
      .toBuffer();

    // Round hero corners with SVG mask
    const heroRounded = await sharp(heroResized)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${heroWidth}" height="${heroHeight}"><rect x="0" y="0" width="${heroWidth}" height="${heroHeight}" rx="36" ry="36" fill="#fff"/></svg>`
          ),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    // 3. Create ambient blurred background (1080x1920)
    const blurredBg = await sharp(rawImageBuffer)
      .resize(1080, 1920, { fit: 'cover' })
      .blur(32)
      .modulate({ brightness: 0.26, saturation: 1.35 })
      .toBuffer();

    // 4. Generate Modern Glassmorphic HUD & Information Card Overlay
    const svgOverlay = this.buildGlassmorphicOverlay(scene, totalScenes);

    // 5. Composite Final 1080x1920 Vertical Frame
    return sharp(blurredBg)
      .composite([
        {
          input: heroRounded,
          top: 300,
          left: 40,
        },
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png({ quality: 95 })
      .toBuffer();
  }

  /**
   * Fetches hero 3D visual from Pollinations AI, falling back to bundled 3D library if rate-limited.
   */
  private async getHeroImage(scene: VisualScene): Promise<Buffer> {
    const prompt = this.buildPromptForScene(scene);
    logger.debug(`[PollinationsVisualProvider] Generated prompt for scene ${scene.index}: "${prompt}"`);

    // Attempt 1: Try live Pollinations generation
    try {
      const liveBuffer = await this.fetchFromPollinations(prompt);
      if (liveBuffer && liveBuffer.length > 5000) {
        const meta = await sharp(liveBuffer).metadata();
        if (meta.width && meta.height) {
          logger.debug(`[PollinationsVisualProvider] Live 3D generation succeeded (${meta.width}x${meta.height})`);
          return liveBuffer;
        }
      }
    } catch (e: any) {
      logger.debug(`[PollinationsVisualProvider] Live generation notice: ${e.message}`);
    }

    // Attempt 2: Use bundled high-resolution 3D Pixar scene asset
    const localAssetPath = this.getLocalFallbackAsset(scene.type, scene.index);
    if (fs.existsSync(localAssetPath)) {
      logger.debug(`[PollinationsVisualProvider] Using authentic 3D Pixar asset from ${localAssetPath}`);
      return fs.promises.readFile(localAssetPath);
    }

    throw new Error('No hero image could be retrieved for 3D scene');
  }

  /**
   * Concise prompt engineering tailored for Pollinations free tier (under 14 words, no trademark words).
   */
  private buildPromptForScene(scene: VisualScene): string {
    const typePrompts: Record<string, string> = {
      hook: '3D pixar style cute robot discovering breakthrough AI technology, vibrant 8k render',
      explanation: '3D pixar style cute robot in futuristic laboratory with holographic displays, vibrant 8k render',
      benefit: '3D pixar style robot flying with rocket booster in future city, vibrant 8k render',
      cta: '3D pixar style robot holding glowing holographic follow button, vibrant 8k render',
    };

    return typePrompts[scene.type] || '3D pixar style cute friendly robot in high tech lab, vibrant 8k render';
  }

  /**
   * Downloads image from Pollinations via curl or HTTP request with redirect follow.
   */
  private async fetchFromPollinations(prompt: string): Promise<Buffer> {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024`;
    const tmpFile = path.join(
      path.resolve(process.cwd(), 'uploads'),
      `poll_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`
    );

    await fs.promises.mkdir(path.dirname(tmpFile), { recursive: true });

    return new Promise((resolve, reject) => {
      execFile('curl', ['-s', '-L', '--max-time', '15', url, '-o', tmpFile], async (err) => {
        try {
          if (err) {
            try { await fs.promises.unlink(tmpFile); } catch {}
            return reject(err);
          }

          if (!fs.existsSync(tmpFile)) {
            return reject(new Error('Pollinations response file missing'));
          }

          const buf = await fs.promises.readFile(tmpFile);
          try { await fs.promises.unlink(tmpFile); } catch {}

          if (buf.length < 500) {
            return reject(new Error(`Invalid image payload (${buf.length} bytes)`));
          }

          resolve(buf);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  /**
   * Retrieves local 3D Pixar fallback asset based on scene role.
   */
  private getLocalFallbackAsset(sceneType: string, index: number): string {
    const map: Record<string, string> = {
      hook: 'scene_hook.jpg',
      explanation: 'scene_explanation.jpg',
      benefit: 'scene_benefit.jpg',
      cta: 'scene_cta.jpg',
    };

    const filename = map[sceneType] || (index % 2 === 0 ? 'scene_alt1.jpg' : 'scene_alt2.jpg');
    return path.join(this.localAssetDir, filename);
  }

  /**
   * Escapes XML characters for SVG rendering safety.
   */
  private escapeXml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Wraps text into lines with maximum character count.
   */
  private wrapText(text: string, maxCharsPerLine: number = 28): string[] {
    const words = (text || '').split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Builds the Glassmorphic UI/UX SVG overlay.
   */
  private buildGlassmorphicOverlay(scene: VisualScene, totalScenes: number): string {
    const channelName = config.branding.channelName || 'AI Daily Radar';
    const watermark = config.branding.watermarkText || '@AIDailyRadar';
    const category = (scene.category || 'AI Tools').toUpperCase();

    // Theme metadata per scene
    const badges: Record<string, { label: string; pill: string; chip1: string; chip2: string; chip3: string }> = {
      hook: {
        label: 'AI BREAKTHROUGH',
        pill: 'NEW',
        chip1: '⚡ 100% Free Tool',
        chip2: '🚀 Zero GPU Required',
        chip3: '🌟 8K Quality',
      },
      explanation: {
        label: 'NEXT-GEN CAPABILITY',
        pill: 'HOW IT WORKS',
        chip1: '🧠 Neural Network',
        chip2: '⚡ Instant Results',
        chip3: '🔓 No Signup',
      },
      benefit: {
        label: 'THE UNFAIR ADVANTAGE',
        pill: '10X BOOST',
        chip1: '📈 10x Productivity',
        chip2: '💼 Pro Workflow',
        chip3: '🔥 Top Rated',
      },
      cta: {
        label: 'STAY AHEAD IN AI',
        pill: 'TRENDING',
        chip1: '📌 Save This Reel',
        chip2: '💬 Drop A Comment',
        chip3: '🚀 Follow For Daily AI',
      },
    };

    const meta = badges[scene.type] || badges.hook;

    const headlineLines = this.wrapText(scene.headline, 24);
    const bodyLines = this.wrapText(scene.bodyText, 34).slice(0, 2);

    const headlineSvg = headlineLines
      .slice(0, 2)
      .map(
        (line, idx) =>
          `<text x="45" y="${65 + idx * 46}" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="900" fill="#FFFFFF">${this.escapeXml(
            line
          )}</text>`
      )
      .join('\n');

    const bodySvg = bodyLines
      .map(
        (line, idx) =>
          `<text x="45" y="${160 + idx * 36}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="500" fill="#CBD5E1">${this.escapeXml(
            line
          )}</text>`
      )
      .join('\n');

    const progressWidth = Math.round(((scene.index + 1) / totalScenes) * 980);

    return `
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topVig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#030712" stop-opacity="0.95"/>
        <stop offset="65%" stop-color="#030712" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
      </linearGradient>

      <linearGradient id="bottomVig" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#030712" stop-opacity="0"/>
        <stop offset="40%" stop-color="#030712" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#030712" stop-opacity="0.95"/>
      </linearGradient>

      <linearGradient id="neonBorder" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#00F2FE"/>
        <stop offset="50%" stop-color="#4FACFE"/>
        <stop offset="100%" stop-color="#FF007A"/>
      </linearGradient>

      <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#FF007A"/>
        <stop offset="100%" stop-color="#7928CA"/>
      </linearGradient>
    </defs>

    <!-- Top dark vignette for crystal clear text readability -->
    <rect x="0" y="0" width="1080" height="440" fill="url(#topVig)"/>

    <!-- Top Floating HUD Pill Badge -->
    <g transform="translate(540, 140)">
      <rect x="-270" y="-42" width="540" height="84" rx="42" fill="#0B0F19" fill-opacity="0.9" stroke="url(#neonBorder)" stroke-width="3"/>
      <circle cx="-210" cy="0" r="10" fill="#00F2FE"/>
      <text x="-180" y="8" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" letter-spacing="2">${this.escapeXml(
        meta.label
      )}</text>
      <rect x="110" y="-26" width="125" height="52" rx="26" fill="url(#badgeGrad)"/>
      <text x="172" y="8" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${this.escapeXml(
        meta.pill
      )}</text>
    </g>

    <!-- Category / Headline Banner -->
    <g transform="translate(540, 245)">
      <text x="0" y="0" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="900" fill="#00F2FE" letter-spacing="1">⚡ ${this.escapeXml(
        category
      )}</text>
    </g>

    <!-- Hero Card Glowing Neon Border -->
    <rect x="40" y="300" width="1000" height="960" rx="36" fill="none" stroke="url(#neonBorder)" stroke-width="4"/>

    <!-- Bottom dark vignette -->
    <rect x="0" y="1100" width="1080" height="820" fill="url(#bottomVig)"/>

    <!-- Bottom Glassmorphic Information Card -->
    <g transform="translate(50, 1290)">
      <rect x="0" y="0" width="980" height="490" rx="36" fill="#080C18" fill-opacity="0.9" stroke="url(#neonBorder)" stroke-width="3"/>
      
      <!-- Scene Title -->
      ${headlineSvg}
      
      <!-- Body Text -->
      ${bodySvg}

      <!-- Feature Chips -->
      <g transform="translate(45, 250)">
        <rect x="0" y="0" width="260" height="54" rx="16" fill="#1E293B" stroke="#38EF7D" stroke-width="2"/>
        <text x="130" y="35" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#38EF7D">${this.escapeXml(
          meta.chip1
        )}</text>
      </g>
      <g transform="translate(330, 250)">
        <rect x="0" y="0" width="295" height="54" rx="16" fill="#1E293B" stroke="#00F2FE" stroke-width="2"/>
        <text x="147" y="35" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#00F2FE">${this.escapeXml(
          meta.chip2
        )}</text>
      </g>
      <g transform="translate(650, 250)">
        <rect x="0" y="0" width="285" height="54" rx="16" fill="#1E293B" stroke="#FFB800" stroke-width="2"/>
        <text x="142" y="35" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#FFB800">${this.escapeXml(
          meta.chip3
        )}</text>
      </g>

      <!-- Branding & CTA -->
      <text x="45" y="420" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#94A3B8">${this.escapeXml(
        watermark
      )} • Save &amp; Share for Daily AI Secrets</text>
    </g>

    <!-- Animated Progress Bar -->
    <rect x="50" y="1820" width="980" height="10" rx="5" fill="#1E293B"/>
    <rect x="50" y="1820" width="${progressWidth}" height="10" rx="5" fill="url(#neonBorder)"/>
  </svg>
    `;
  }
}

export const pollinationsVisualProvider = new PollinationsVisualProvider();
