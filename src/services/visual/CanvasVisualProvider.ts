import sharp from 'sharp';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { config } from '../../config/index.js';

export class CanvasVisualProvider implements VisualProvider {
  name = 'CanvasVisualProvider';

  async generateVisuals(scenes: VisualScene[]): Promise<VisualResult[]> {
    const results: VisualResult[] = [];

    for (const scene of scenes) {
      const svg = this.renderSceneSvg(scene);
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 95 })
        .toBuffer();

      results.push({
        sceneIndex: scene.index,
        imageBuffer: pngBuffer,
        durationSeconds: scene.durationSeconds,
      });
    }

    return results;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private wrapText(text: string, maxCharsPerLine: number = 28): string[] {
    const words = text.split(/\s+/);
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

  private renderSceneSvg(scene: VisualScene): string {
    const width = 1080;
    const height = 1920;
    const channelName = config.branding.channelName;
    const watermark = config.branding.watermarkText;
    const category = scene.category || 'AI Tools';

    // Color accents based on scene type
    const accentColors = {
      hook: { primary: '#6366F1', secondary: '#EC4899', badge: '🔥 BREAKTHROUGH AI' },
      explanation: { primary: '#3B82F6', secondary: '#06B6D4', badge: '⚡ HOW IT WORKS' },
      benefit: { primary: '#10B981', secondary: '#3B82F6', badge: '💡 KEY ADVANTAGE' },
      cta: { primary: '#F59E0B', secondary: '#EF4444', badge: '🚀 DON\'T MISS OUT' },
    };

    const theme = accentColors[scene.type] || accentColors.hook;
    const headlineLines = this.wrapText(scene.headline, 24);
    const bodyLines = this.wrapText(scene.bodyText, 32);

    const headlineTspans = headlineLines
      .slice(0, 3)
      .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 70}">${this.escapeXml(line)}</tspan>`)
      .join('');

    const bodyTspans = bodyLines
      .slice(0, 5)
      .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 52}">${this.escapeXml(line)}</tspan>`)
      .join('');

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070A12"/>
      <stop offset="50%" stop-color="#0D1322"/>
      <stop offset="100%" stop-color="#05070B"/>
    </linearGradient>

    <!-- Accent Glow Gradients -->
    <radialGradient id="glowTop" cx="50%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${theme.primary}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glowBottom" cx="50%" cy="85%" r="55%">
      <stop offset="0%" stop-color="${theme.secondary}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="neonBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.primary}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${theme.secondary}" stop-opacity="0.3"/>
    </linearGradient>

    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <!-- Dark Canvas Base -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#glowTop)"/>
  <rect width="${width}" height="${height}" fill="url(#glowBottom)"/>

  <!-- Subtle Futuristic Grid Pattern -->
  <g stroke="#ffffff" stroke-width="1" opacity="0.04">
    <line x1="120" y1="0" x2="120" y2="1920"/>
    <line x1="960" y1="0" x2="960" y2="1920"/>
    <line x1="0" y1="360" x2="1080" y2="360"/>
    <line x1="0" y1="1560" x2="1080" y2="1560"/>
  </g>

  <!-- Top Channel & Category Bar -->
  <g id="header">
    <rect x="80" y="120" width="920" height="90" rx="45" fill="#131B2E" fill-opacity="0.7" stroke="#2A3859" stroke-width="2"/>
    
    <!-- Live indicator dot -->
    <circle cx="130" cy="165" r="10" fill="#10B981"/>
    <circle cx="130" cy="165" r="16" fill="#10B981" fill-opacity="0.25"/>

    <text x="165" y="173" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#F8FAFC" letter-spacing="1.5">
      ${this.escapeXml(channelName.toUpperCase())}
    </text>

    <!-- Category Pill -->
    <rect x="760" y="140" width="210" height="50" rx="25" fill="${theme.primary}" fill-opacity="0.2" stroke="${theme.primary}" stroke-width="1.5"/>
    <text x="865" y="172" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="${theme.primary}" text-anchor="middle">
      ${this.escapeXml(category)}
    </text>
  </g>

  <!-- Central Visual Card -->
  <g id="mainCard">
    <!-- Card Outer Glow & Border -->
    <rect x="70" y="270" width="940" height="1100" rx="48" fill="#0E1626" fill-opacity="0.75" stroke="url(#neonBorder)" stroke-width="2.5"/>

    <!-- Section Badge -->
    <rect x="130" y="330" width="340" height="60" rx="30" fill="${theme.primary}" fill-opacity="0.18" stroke="${theme.primary}" stroke-width="1.5"/>
    <text x="300" y="369" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
      ${theme.badge}
    </text>

    <!-- Main Headline -->
    <text x="540" y="490" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif" font-size="52" font-weight="900" fill="url(#textGrad)" text-anchor="middle">
      ${headlineTspans}
    </text>

    <!-- Decorative Divider -->
    <line x1="160" y1="720" x2="920" y2="720" stroke="#334155" stroke-width="2" stroke-dasharray="8 8"/>

    <!-- Explanatory / Feature Text -->
    <text x="540" y="810" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="500" fill="#CBD5E1" text-anchor="middle">
      ${bodyTspans}
    </text>

    <!-- Decorative Tech Elements in Card Base -->
    <g transform="translate(140, 1150)">
      <rect width="800" height="140" rx="24" fill="#162238" fill-opacity="0.6" stroke="#253554" stroke-width="1.5"/>
      <circle cx="60" cy="70" r="28" fill="${theme.primary}" fill-opacity="0.25"/>
      <text x="60" y="79" font-family="sans-serif" font-size="26" text-anchor="middle" fill="#FFFFFF">✨</text>
      <text x="110" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="700" fill="#FFFFFF">AI Innovation</text>
      <text x="110" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="#94A3B8">Verified Official Release • 2026</text>
    </g>
  </g>

  <!-- Scene Timeline Progress Indicator -->
  <g id="progressDots" transform="translate(420, 1420)">
    ${[0, 1, 2, 3]
      .map((idx) => {
        const isActive = idx === scene.index;
        const color = isActive ? theme.primary : '#334155';
        const r = isActive ? 12 : 7;
        return `<circle cx="${idx * 60}" cy="0" r="${r}" fill="${color}" stroke="#FFFFFF" stroke-width="${isActive ? 2 : 0}"/>`;
      })
      .join('')}
  </g>

  <!-- Watermark & Branding Footer (Reserved safe zone above Shorts title UI) -->
  <g id="footer">
    <rect x="240" y="1480" width="600" height="70" rx="35" fill="#0A0F1D" fill-opacity="0.85" stroke="#1E293B" stroke-width="1.5"/>
    <text x="540" y="1524" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="700" fill="#94A3B8" text-anchor="middle" letter-spacing="1">
      ${this.escapeXml(watermark)}
    </text>
  </g>
</svg>
    `.trim();
  }
}

export const canvasVisualProvider = new CanvasVisualProvider();
