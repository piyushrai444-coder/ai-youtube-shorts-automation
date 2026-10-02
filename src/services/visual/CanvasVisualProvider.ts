import sharp from 'sharp';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { config } from '../../config/index.js';

export class CanvasVisualProvider implements VisualProvider {
  name = 'CanvasVisualProvider';

  async generateVisuals(scenes: VisualScene[]): Promise<VisualResult[]> {
    const results: VisualResult[] = [];

    for (const scene of scenes) {
      const svg = this.renderSceneSvg(scene, scenes.length);
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

  private wrapText(text: string, maxCharsPerLine: number = 24): string[] {
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

  private renderSceneSvg(scene: VisualScene, totalScenes: number = 4): string {
    const width = 1080;
    const height = 1920;
    const channelName = config.branding.channelName;
    const watermark = config.branding.watermarkText;
    const category = (scene.category || 'AI Tools').toUpperCase();

    // Scene theme palettes with vibrant cyberpunk neon colors
    const sceneThemes = {
      hook: {
        primary: '#00F2FE',
        secondary: '#4FACFE',
        accent: '#FF007A',
        badge: '🚨 BREAKTHROUGH AI ALERT',
        icon: '⚡',
        subBadge: 'TRENDING WORLDWIDE',
      },
      explanation: {
        primary: '#38EF7D',
        secondary: '#11998E',
        accent: '#00F2FE',
        badge: '🧠 HOW IT ACTUALLY WORKS',
        icon: '🔮',
        subBadge: 'NEXT-GEN CAPABILITY',
      },
      benefit: {
        primary: '#FFB800',
        secondary: '#FF4E50',
        accent: '#00F5A0',
        badge: '💡 THE UNFAIR ADVANTAGE',
        icon: '🚀',
        subBadge: '10X PRODUCTIVITY BOOST',
      },
      cta: {
        primary: '#FF007A',
        secondary: '#7928CA',
        accent: '#FFB800',
        badge: '🔥 DON\'T MISS THE FUTURE',
        icon: '📌',
        subBadge: 'SAVE + SHARE THIS REEL',
      },
    };

    const theme = sceneThemes[scene.type] || sceneThemes.hook;
    const progressWidth = Math.round(((scene.index + 1) / totalScenes) * width);

    // Format headlines and body text
    const headlineLines = this.wrapText(scene.headline, 22);
    const bodyLines = this.wrapText(scene.bodyText, 30);

    const headlineTspans = headlineLines
      .slice(0, 3)
      .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 66}">${this.escapeXml(line)}</tspan>`)
      .join('');

    const bodyTspans = bodyLines
      .slice(0, 4)
      .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 50}">${this.escapeXml(line)}</tspan>`)
      .join('');

    // Specific middle graphic based on scene type
    let middleGraphic = '';
    if (scene.type === 'hook') {
      middleGraphic = `
        <!-- Holographic HUD Radar and Eye Catching Center Element -->
        <g transform="translate(540, 940)">
          <circle cx="0" cy="0" r="130" fill="${theme.primary}" fill-opacity="0.08" stroke="${theme.primary}" stroke-width="2" stroke-dasharray="12 12"/>
          <circle cx="0" cy="0" r="95" fill="none" stroke="${theme.accent}" stroke-width="2.5" opacity="0.6"/>
          <circle cx="0" cy="0" r="60" fill="${theme.secondary}" fill-opacity="0.25"/>
          <text x="0" y="24" font-size="64" text-anchor="middle">⚡</text>
          
          <!-- Outer Orbiting Tech Markers -->
          <circle cx="-130" cy="0" r="6" fill="${theme.primary}"/>
          <circle cx="130" cy="0" r="6" fill="${theme.accent}"/>
          <circle cx="0" cy="-130" r="6" fill="${theme.secondary}"/>
          <circle cx="0" cy="130" r="6" fill="${theme.primary}"/>
        </g>
      `;
    } else if (scene.type === 'explanation') {
      middleGraphic = `
        <!-- Two Tech Feature Badges -->
        <g transform="translate(140, 850)">
          <rect x="0" y="0" width="800" height="90" rx="24" fill="#132038" fill-opacity="0.75" stroke="${theme.primary}" stroke-width="1.5"/>
          <text x="50" y="55" font-size="34">🤖</text>
          <text x="110" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">Automated Intelligence</text>
          <text x="110" y="72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" fill="#94A3B8">Replaces hours of manual repetitive work</text>
        </g>
        <g transform="translate(140, 960)">
          <rect x="0" y="0" width="800" height="90" rx="24" fill="#132038" fill-opacity="0.75" stroke="${theme.secondary}" stroke-width="1.5"/>
          <text x="50" y="55" font-size="34">⚡</text>
          <text x="110" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">Zero Learning Curve</text>
          <text x="110" y="72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" fill="#94A3B8">Instant browser-ready deployment</text>
        </g>
      `;
    } else if (scene.type === 'benefit') {
      middleGraphic = `
        <!-- Massive Impact Stat Badge -->
        <g transform="translate(540, 930)">
          <rect x="-350" y="-80" width="700" height="160" rx="32" fill="#0F231D" fill-opacity="0.85" stroke="${theme.primary}" stroke-width="2"/>
          <text x="0" y="-15" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="${theme.primary}" text-anchor="middle" letter-spacing="2">
            10X PRODUCTIVITY
          </text>
          <text x="0" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#E2E8F0" text-anchor="middle">
            Supercharges your daily workflow immediately 🚀
          </text>
        </g>
      `;
    } else {
      // CTA
      middleGraphic = `
        <!-- Action Callout Box -->
        <g transform="translate(540, 930)">
          <rect x="-380" y="-75" width="760" height="150" rx="36" fill="#24102D" fill-opacity="0.85" stroke="${theme.primary}" stroke-width="2"/>
          <text x="0" y="-12" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle">
            FOLLOW @${this.escapeXml(channelName.toUpperCase())}
          </text>
          <text x="0" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="${theme.secondary}" text-anchor="middle" letter-spacing="1">
            🔔 DAILY BREAKTHROUGH AI TOOLS
          </text>
        </g>
      `;
    }

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04060A"/>
      <stop offset="50%" stop-color="#090E18"/>
      <stop offset="100%" stop-color="#030408"/>
    </linearGradient>

    <!-- Top Glow -->
    <radialGradient id="topGlow" cx="50%" cy="15%" r="60%">
      <stop offset="0%" stop-color="${theme.primary}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Bottom Glow -->
    <radialGradient id="bottomGlow" cx="50%" cy="85%" r="55%">
      <stop offset="0%" stop-color="${theme.secondary}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Card Neon Stroke -->
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.primary}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${theme.secondary}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${theme.primary}" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Progress Bar Gradient -->
    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.primary}"/>
      <stop offset="100%" stop-color="${theme.secondary}"/>
    </linearGradient>

    <!-- Headline Gradient -->
    <linearGradient id="headlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${theme.primary}"/>
    </linearGradient>
  </defs>

  <!-- Dark Background and Ambient Radial Glows -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#topGlow)"/>
  <rect width="${width}" height="${height}" fill="url(#bottomGlow)"/>

  <!-- Futuristic Background Grid -->
  <g stroke="#ffffff" stroke-width="1" opacity="0.035">
    <line x1="140" y1="0" x2="140" y2="1920"/>
    <line x1="940" y1="0" x2="940" y2="1920"/>
    <line x1="0" y1="420" x2="1080" y2="420"/>
    <line x1="0" y1="1450" x2="1080" y2="1450"/>
  </g>

  <!-- Top Story Progress Bar -->
  <rect x="0" y="0" width="${width}" height="10" fill="#1E293B"/>
  <rect x="0" y="0" width="${progressWidth}" height="10" fill="url(#progressGrad)"/>

  <!-- Top Header Pill -->
  <g id="headerBar">
    <rect x="70" y="60" width="940" height="96" rx="48" fill="#0C1424" fill-opacity="0.85" stroke="#1E2D4A" stroke-width="2"/>
    
    <!-- Live Pulse Dot -->
    <circle cx="130" cy="108" r="10" fill="#10B981"/>
    <circle cx="130" cy="108" r="18" fill="#10B981" fill-opacity="0.25"/>

    <!-- Channel Name -->
    <text x="170" y="117" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#F8FAFC" letter-spacing="1.5">
      ${this.escapeXml(channelName.toUpperCase())}
    </text>

    <!-- Category Pill -->
    <rect x="740" y="80" width="230" height="54" rx="27" fill="${theme.primary}" fill-opacity="0.2" stroke="${theme.primary}" stroke-width="1.8"/>
    <text x="855" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="${theme.primary}" text-anchor="middle" letter-spacing="1">
      ${this.escapeXml(category)}
    </text>
  </g>

  <!-- Main Glassmorphism Card (Safe zone between y=200 and y=1400) -->
  <g id="mainCard">
    <rect x="65" y="195" width="950" height="1180" rx="44" fill="#080F1C" fill-opacity="0.82" stroke="url(#cardBorder)" stroke-width="2.5"/>

    <!-- Top Badge -->
    <g transform="translate(110, 235)">
      <rect width="420" height="60" rx="30" fill="${theme.primary}" fill-opacity="0.18" stroke="${theme.primary}" stroke-width="1.6"/>
      <text x="210" y="39" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.2">
        ${this.escapeXml(theme.badge)}
      </text>
    </g>

    <!-- Sub-badge -->
    <text x="960" y="272" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="${theme.accent}" text-anchor="end" letter-spacing="1">
      ${this.escapeXml(theme.subBadge)}
    </text>

    <!-- High Impact Headline -->
    <text x="540" y="390" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif" font-size="52" font-weight="900" fill="url(#headlineGrad)" text-anchor="middle">
      ${headlineTspans}
    </text>

    <!-- Neon Divider -->
    <line x1="140" y1="580" x2="940" y2="580" stroke="${theme.primary}" stroke-width="2.5" stroke-opacity="0.5" stroke-dasharray="16 10"/>

    <!-- Explanatory Body Summary -->
    <text x="540" y="660" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="600" fill="#CBD5E1" text-anchor="middle">
      ${bodyTspans}
    </text>

    <!-- Dynamic Middle Graphic Component -->
    ${middleGraphic}

    <!-- Bottom Feature Tag inside Card -->
    <g transform="translate(130, 1240)">
      <rect width="820" height="90" rx="24" fill="#0F1829" fill-opacity="0.9" stroke="#1E2E4A" stroke-width="1.5"/>
      <circle cx="55" cy="45" r="24" fill="${theme.primary}" fill-opacity="0.25"/>
      <text x="55" y="53" font-size="22" text-anchor="middle">⚡</text>
      <text x="95" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF">AI Innovation Pulse</text>
      <text x="95" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" fill="#94A3B8">Verified Release • Tested &amp; Evaluated for 2026</text>
    </g>
  </g>

  <!-- Bottom Safe Zone Floating Brand Watermark (Above YouTube UI) -->
  <g id="brandWatermark">
    <rect x="260" y="1420" width="560" height="74" rx="37" fill="#060A14" fill-opacity="0.92" stroke="#1B2943" stroke-width="2"/>
    <text x="540" y="1467" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="${theme.primary}" text-anchor="middle" letter-spacing="1.5">
      ${this.escapeXml(watermark)}
    </text>
  </g>
</svg>
    `.trim();
  }
}

export const canvasVisualProvider = new CanvasVisualProvider();
