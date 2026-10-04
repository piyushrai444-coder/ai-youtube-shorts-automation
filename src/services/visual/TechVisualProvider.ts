import sharp from 'sharp';
import { VisualProvider, VisualScene, VisualResult } from './VisualProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class TechVisualProvider implements VisualProvider {
  name = 'TechVisualProvider';

  async generateVisuals(scenes: VisualScene[]): Promise<VisualResult[]> {
    logger.info(`[TechVisualProvider] Generating ${scenes.length} viral tech/IDE mockup scenes...`);
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
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // strip all surrogate pair emojis from SVG
      .replace(/[\u2600-\u27BF]/g, ''); // strip miscellaneous symbols
  }

  private wrapText(text: string, maxChars: number = 26): string[] {
    const words = (text || '').split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const w of words) {
      if ((current + ' ' + w).trim().length <= maxChars) {
        current = (current + ' ' + w).trim();
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private renderSceneSvg(scene: VisualScene, totalScenes: number): string {
    const category = this.escapeXml((scene.category || 'AI Tools').toUpperCase());
    const channelHandle = config.branding.watermarkText || '@AIDailyRadar';

    let centerHeroSvg = '';
    let badgeTitle = 'AI BREAKTHROUGH';
    let badgeColor = '#00F2FE';
    let progressColor = '#00F2FE';

    if (scene.type === 'hook') {
      badgeTitle = '⚡ VIRAL AI DISCOVERY';
      badgeColor = '#00F2FE';
      progressColor = '#00F2FE';
      centerHeroSvg = this.renderHookTerminal(scene);
    } else if (scene.type === 'explanation') {
      badgeTitle = '⚡ LIVE CODE DEMO';
      badgeColor = '#38EF7D';
      progressColor = '#38EF7D';
      centerHeroSvg = this.renderIdeCode(scene);
    } else if (scene.type === 'benefit') {
      badgeTitle = '⚡ 10X UNFAIR ADVANTAGE';
      badgeColor = '#FFB800';
      progressColor = '#FFB800';
      centerHeroSvg = this.renderComparisonMetrics(scene);
    } else {
      badgeTitle = '★ SAVE &amp; FOLLOW';
      badgeColor = '#FF007A';
      progressColor = '#FF007A';
      centerHeroSvg = this.renderCallToAction(scene);
    }

    const headlineLines = this.wrapText(this.escapeXml(scene.headline), 22).slice(0, 2);
    const bodyLines = this.wrapText(this.escapeXml(scene.bodyText), 32).slice(0, 4);

    const headlineSvg = headlineLines
      .map(
        (line, idx) =>
          `<text x="50" y="${75 + idx * 46}" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="#FFFFFF">${line}</text>`
      )
      .join('\n');

    const bodySvg = bodyLines
      .map(
        (line, idx) =>
          `<text x="50" y="${175 + idx * 36}" font-family="Arial, sans-serif" font-size="26" font-weight="500" fill="#CBD5E1">${line}</text>`
      )
      .join('\n');

    const progressWidth = Math.round(((scene.index + 1) / totalScenes) * 980);

    return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#060913"/>
          <stop offset="35%" stop-color="#0C1322"/>
          <stop offset="100%" stop-color="#04060C"/>
        </linearGradient>

        <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00F2FE" stop-opacity="0.8"/>
          <stop offset="50%" stop-color="#7928CA" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#FF007A" stop-opacity="0.8"/>
        </linearGradient>

        <linearGradient id="neonCyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00F2FE"/>
          <stop offset="100%" stop-color="#4FACFE"/>
        </linearGradient>

        <linearGradient id="neonGreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#38EF7D"/>
          <stop offset="100%" stop-color="#11998E"/>
        </linearGradient>

        <linearGradient id="neonAmber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFB800"/>
          <stop offset="100%" stop-color="#FF4E50"/>
        </linearGradient>

        <radialGradient id="ambientGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="${badgeColor}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Background with Radial Ambient Glow -->
      <rect width="1080" height="1920" fill="url(#bgGrad)"/>
      <circle cx="540" cy="720" r="650" fill="url(#ambientGlow)"/>

      <!-- Sleek Subtle Cyber Grid Background -->
      <g stroke="#1E293B" stroke-width="1" opacity="0.3">
        <line x1="140" y1="0" x2="140" y2="1920"/>
        <line x1="540" y1="0" x2="540" y2="1920"/>
        <line x1="940" y1="0" x2="940" y2="1920"/>
        <line x1="0" y1="340" x2="1080" y2="340"/>
        <line x1="0" y1="780" x2="1080" y2="780"/>
        <line x1="0" y1="1240" x2="1080" y2="1240"/>
      </g>

      <!-- Top Centered Header Badge (Clean & Balanced, No Collision) -->
      <g transform="translate(540, 150)">
        <rect x="-240" y="-38" width="480" height="76" rx="38" fill="#0B0F19" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="2.5"/>
        <circle cx="-180" cy="0" r="8" fill="${badgeColor}"/>
        <text x="0" y="8" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" letter-spacing="1.5">${badgeTitle}</text>
      </g>

      <text x="540" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="${badgeColor}" letter-spacing="1">⚡ ${category}</text>

      <!-- Center Hero Viewport (IDE / Terminal / Comparison Mockup) -->
      ${centerHeroSvg}

      <!-- Bottom Glassmorphic Information Card -->
      <g transform="translate(50, 1270)">
        <rect width="980" height="510" rx="36" fill="#080C18" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="3"/>
        
        <!-- Headline -->
        ${headlineSvg}

        <!-- Body / Subtext -->
        ${bodySvg}

        <!-- 3 Vibrant Feature Badges -->
        <g transform="translate(50, 335)">
          <rect width="260" height="54" rx="16" fill="#1E293B" stroke="#38EF7D" stroke-width="2"/>
          <text x="130" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#38EF7D">⚡ 100% Free Tool</text>
        </g>
        <g transform="translate(330, 335)">
          <rect width="295" height="54" rx="16" fill="#1E293B" stroke="#00F2FE" stroke-width="2"/>
          <text x="147" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#00F2FE">🚀 Zero GPU Needed</text>
        </g>
        <g transform="translate(645, 335)">
          <rect width="285" height="54" rx="16" fill="#1E293B" stroke="#FFB800" stroke-width="2"/>
          <text x="142" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#FFB800">🌟 Top Rated AI</text>
        </g>

        <!-- Channel Branding Footer -->
        <text x="50" y="450" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#94A3B8">${channelHandle} • Save &amp; Share for Daily AI Secrets</text>
      </g>

      <!-- Animated Bottom Progress Line -->
      <rect x="50" y="1820" width="980" height="10" rx="5" fill="#1E293B"/>
      <rect x="50" y="1820" width="${progressWidth}" height="10" rx="5" fill="${progressColor}"/>
    </svg>
    `;
  }

  /**
   * Scene 0: Glowing AI Prompt Input Bar + Live Terminal Initialization
   */
  private renderHookTerminal(scene: VisualScene): string {
    return `
    <g transform="translate(50, 320)">
      <rect width="980" height="900" rx="36" fill="#0B0F19" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="3"/>
      
      <!-- Window Titlebar -->
      <path d="M 0,36 A 36,36 0 0,1 36,0 L 944,0 A 36,36 0 0,1 980,36 L 980,80 L 0,80 Z" fill="#111827"/>
      <circle cx="50" cy="40" r="10" fill="#EF4444"/>
      <circle cx="80" cy="40" r="10" fill="#F59E0B"/>
      <circle cx="110" cy="40" r="10" fill="#10B981"/>
      <text x="540" y="48" text-anchor="middle" font-family="Arial, monospace" font-size="20" font-weight="700" fill="#9CA3AF">claude-opus-5.5 --composer</text>

      <!-- Prompt Input Box -->
      <rect x="40" y="120" width="900" height="220" rx="24" fill="#171F33" stroke="#00F2FE" stroke-width="2"/>
      <text x="70" y="165" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#00F2FE">⚡ PROMPT INPUT</text>
      <text x="70" y="215" font-family="Arial, monospace" font-size="28" font-weight="700" fill="#FFFFFF">&gt; "Build a full-stack SaaS app with</text>
      <text x="70" y="260" font-family="Arial, monospace" font-size="28" font-weight="700" fill="#FFFFFF">   Stripe payments &amp; user auth"</text>
      <rect x="445" y="236" width="14" height="28" fill="#00F2FE"/>

      <!-- Status Bar -->
      <g transform="translate(40, 380)">
        <rect width="900" height="90" rx="20" fill="#0F172A" stroke="#38EF7D" stroke-width="2"/>
        <circle cx="50" cy="45" r="12" fill="#38EF7D"/>
        <text x="80" y="53" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#38EF7D">⚡ AI STATUS: GENERATING PRODUCTION CODE...</text>
        <text x="840" y="53" font-family="Arial, monospace" font-size="24" font-weight="700" fill="#94A3B8">100%</text>
      </g>

      <!-- Progress Line -->
      <rect x="40" y="495" width="900" height="14" rx="7" fill="#1F2937"/>
      <rect x="40" y="495" width="780" height="14" rx="7" fill="url(#neonCyan)"/>

      <!-- Live Terminal Output -->
      <rect x="40" y="535" width="900" height="320" rx="20" fill="#050811" stroke="#374151" stroke-width="1.5"/>
      <text x="70" y="585" font-family="monospace" font-size="22" fill="#10B981">✓ [1/4] Next.js 15 App Router initialized</text>
      <text x="70" y="630" font-family="monospace" font-size="22" fill="#10B981">✓ [2/4] PostgreSQL schema &amp; Prisma ORM linked</text>
      <text x="70" y="675" font-family="monospace" font-size="22" fill="#10B981">✓ [3/4] Stripe webhook &amp; checkout sessions configured</text>
      <text x="70" y="720" font-family="monospace" font-size="22" fill="#38EF7D">✓ [4/4] 1,420 lines generated with 0 syntax errors</text>
      <text x="70" y="780" font-family="monospace" font-size="24" font-weight="700" fill="#00F2FE">⚡ Production build live at localhost:3000 (0.4s)</text>
    </g>
    `;
  }

  /**
   * Scene 1: Dark Mode IDE Code Editor Preview with Syntax Highlighting
   */
  private renderIdeCode(scene: VisualScene): string {
    return `
    <g transform="translate(50, 320)">
      <rect width="980" height="900" rx="36" fill="#0B0F19" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="3"/>
      
      <!-- Window Titlebar with Tabs -->
      <path d="M 0,36 A 36,36 0 0,1 36,0 L 944,0 A 36,36 0 0,1 980,36 L 980,80 L 0,80 Z" fill="#111827"/>
      <circle cx="50" cy="40" r="10" fill="#EF4444"/>
      <circle cx="80" cy="40" r="10" fill="#F59E0B"/>
      <circle cx="110" cy="40" r="10" fill="#10B981"/>

      <rect x="160" y="15" width="230" height="55" rx="12" fill="#1F2937"/>
      <text x="275" y="50" text-anchor="middle" font-family="Arial, monospace" font-size="19" font-weight="700" fill="#38EF7D">⚡ api/checkout.ts</text>

      <rect x="405" y="15" width="200" height="55" rx="12" fill="#111827"/>
      <text x="505" y="50" text-anchor="middle" font-family="Arial, monospace" font-size="19" font-weight="500" fill="#6B7280">database.prisma</text>

      <!-- Code Area -->
      <rect x="40" y="115" width="900" height="620" rx="20" fill="#050811" stroke="#1F2937" stroke-width="1.5"/>

      <!-- Line Numbers -->
      <text x="70" y="170" font-family="monospace" font-size="22" fill="#4B5563">01</text>
      <text x="70" y="215" font-family="monospace" font-size="22" fill="#4B5563">02</text>
      <text x="70" y="260" font-family="monospace" font-size="22" fill="#4B5563">03</text>
      <text x="70" y="305" font-family="monospace" font-size="22" fill="#4B5563">04</text>
      <text x="70" y="350" font-family="monospace" font-size="22" fill="#4B5563">05</text>
      <text x="70" y="395" font-family="monospace" font-size="22" fill="#4B5563">06</text>
      <text x="70" y="440" font-family="monospace" font-size="22" fill="#4B5563">07</text>
      <text x="70" y="485" font-family="monospace" font-size="22" fill="#4B5563">08</text>
      <text x="70" y="530" font-family="monospace" font-size="22" fill="#4B5563">09</text>
      <text x="70" y="575" font-family="monospace" font-size="22" fill="#4B5563">10</text>
      <text x="70" y="620" font-family="monospace" font-size="22" fill="#4B5563">11</text>
      <text x="70" y="665" font-family="monospace" font-size="22" fill="#4B5563">12</text>

      <!-- Syntax Highlighting -->
      <text x="130" y="170" font-family="monospace" font-size="22" fill="#6B7280">// ⚡ Claude Opus 5.5 Auto-Generated in 0.4s</text>
      <text x="130" y="215" font-family="monospace" font-size="22"><tspan fill="#F43F5E">export async function </tspan><tspan fill="#38EF7D">deployAutonomousApp</tspan><tspan fill="#E2E8F0">(prompt: </tspan><tspan fill="#38BDF8">string</tspan><tspan fill="#E2E8F0">) {</tspan></text>
      <text x="160" y="260" font-family="monospace" font-size="22"><tspan fill="#F43F5E">const </tspan><tspan fill="#FBBF24">agent </tspan><tspan fill="#E2E8F0">= </tspan><tspan fill="#F43F5E">await </tspan><tspan fill="#38EF7D">Claude</tspan><tspan fill="#E2E8F0">.init({</tspan></text>
      <text x="190" y="305" font-family="monospace" font-size="22"><tspan fill="#38BDF8">model</tspan><tspan fill="#E2E8F0">: </tspan><tspan fill="#A78BFA">'claude-3-7-sonnet'</tspan><tspan fill="#E2E8F0">,</tspan></text>
      <text x="190" y="350" font-family="monospace" font-size="22"><tspan fill="#38BDF8">reasoning</tspan><tspan fill="#E2E8F0">: </tspan><tspan fill="#A78BFA">'maximum'</tspan><tspan fill="#E2E8F0">,</tspan></text>
      <text x="190" y="395" font-family="monospace" font-size="22"><tspan fill="#38BDF8">autoDebug</tspan><tspan fill="#E2E8F0">: </tspan><tspan fill="#F43F5E">true</tspan></text>
      <text x="160" y="440" font-family="monospace" font-size="22" fill="#E2E8F0">});</text>
      <text x="160" y="485" font-family="monospace" font-size="22"><tspan fill="#F43F5E">return await </tspan><tspan fill="#FBBF24">agent</tspan><tspan fill="#E2E8F0">.</tspan><tspan fill="#38EF7D">buildFullStackApp</tspan><tspan fill="#E2E8F0">(prompt);</tspan></text>
      <text x="130" y="530" font-family="monospace" font-size="22" fill="#E2E8F0">}</text>
      <text x="130" y="585" font-family="monospace" font-size="22" fill="#6B7280">// Deployed in seconds with 0 syntax errors</text>
      <text x="130" y="630" font-family="monospace" font-size="22"><tspan fill="#F43F5E">const </tspan><tspan fill="#FBBF24">app </tspan><tspan fill="#E2E8F0">= </tspan><tspan fill="#F43F5E">await </tspan><tspan fill="#38EF7D">deployAutonomousApp</tspan><tspan fill="#E2E8F0">(userPrompt);</tspan></text>
      <text x="130" y="675" font-family="monospace" font-size="22" fill="#38EF7D">&gt;&gt; Live at https://app.production.live (0.2s)</text>

      <!-- Floating Linter Badge -->
      <g transform="translate(40, 760)">
        <rect width="900" height="95" rx="20" fill="#0F172A" stroke="#38EF7D" stroke-width="2"/>
        <circle cx="50" cy="48" r="12" fill="#38EF7D"/>
        <text x="80" y="56" font-family="Arial, sans-serif" font-size="25" font-weight="800" fill="#38EF7D">✓ 1,420 Lines Verified • 0 Build Errors • 100% Type-Safe</text>
      </g>
    </g>
    `;
  }

  /**
   * Scene 2: High-Impact Speed & Productivity Comparison Dashboard
   */
  private renderComparisonMetrics(scene: VisualScene): string {
    return `
    <g transform="translate(50, 320)">
      <rect width="980" height="900" rx="36" fill="#0B0F19" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="3"/>
      
      <!-- Window Titlebar -->
      <path d="M 0,36 A 36,36 0 0,1 36,0 L 944,0 A 36,36 0 0,1 980,36 L 980,80 L 0,80 Z" fill="#111827"/>
      <circle cx="50" cy="40" r="10" fill="#EF4444"/>
      <circle cx="80" cy="40" r="10" fill="#F59E0B"/>
      <circle cx="110" cy="40" r="10" fill="#10B981"/>
      <text x="540" y="48" text-anchor="middle" font-family="Arial, monospace" font-size="20" font-weight="700" fill="#9CA3AF">benchmark-results --speed-test</text>

      <!-- Benchmark Card 1: Old Manual Way -->
      <g transform="translate(40, 120)">
        <rect width="900" height="200" rx="24" fill="#171A26" stroke="#EF4444" stroke-width="2"/>
        <text x="50" y="60" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#EF4444">[!] OLD WAY: MANUAL CODING</text>
        <text x="50" y="110" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF">140 Hours <tspan font-size="24" fill="#94A3B8">(~3 Weeks)</tspan></text>
        <text x="50" y="155" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#EF4444">- High syntax errors &amp; manual debugging frustration</text>
      </g>

      <!-- VS Indicator -->
      <g transform="translate(540, 350)">
        <circle cx="0" cy="0" r="32" fill="#7928CA" stroke="#FFFFFF" stroke-width="3"/>
        <text x="0" y="9" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF">VS</text>
      </g>

      <!-- Benchmark Card 2: AI Autonomous Way -->
      <g transform="translate(40, 380)">
        <rect width="900" height="240" rx="24" fill="#0B1C1D" stroke="#38EF7D" stroke-width="3"/>
        <text x="50" y="60" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#38EF7D">⚡ NEW WAY: AUTONOMOUS AI AGENT</text>
        <text x="50" y="115" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#38EF7D">30 Seconds <tspan font-size="26" fill="#00F2FE">(2,800x Faster!)</tspan></text>
        <text x="50" y="165" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#A7F3D0">✓ Zero syntax errors • Auto-tested • Production ready</text>
        <rect x="50" y="195" width="800" height="14" rx="7" fill="#1F2937"/>
        <rect x="50" y="195" width="790" height="14" rx="7" fill="url(#neonGreen)"/>
      </g>

      <!-- Summary Stat Box -->
      <g transform="translate(40, 660)">
        <rect width="900" height="190" rx="24" fill="#1E1B4B" stroke="#818CF8" stroke-width="2"/>
        <text x="50" y="60" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#A5B4FC">⚡ OVERALL TIME SAVED</text>
        <text x="50" y="120" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF">99.8% Faster <tspan font-size="28" fill="#FBBF24">⚡</tspan></text>
        <text x="50" y="160" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#C7D2FE">Automate entire workflows without hiring an engineering team</text>
      </g>
    </g>
    `;
  }

  /**
   * Scene 3: Viral Bookmark, Save & Channel Follow Card
   */
  private renderCallToAction(scene: VisualScene): string {
    const handle = config.branding.watermarkText || '@AIDailyRadar';

    return `
    <g transform="translate(50, 320)">
      <rect width="980" height="900" rx="36" fill="#0B0F19" fill-opacity="0.95" stroke="url(#borderGrad)" stroke-width="3"/>
      
      <!-- Window Titlebar -->
      <path d="M 0,36 A 36,36 0 0,1 36,0 L 944,0 A 36,36 0 0,1 980,36 L 980,80 L 0,80 Z" fill="#111827"/>
      <circle cx="50" cy="40" r="10" fill="#EF4444"/>
      <circle cx="80" cy="40" r="10" fill="#F59E0B"/>
      <circle cx="110" cy="40" r="10" fill="#10B981"/>
      <text x="540" y="48" text-anchor="middle" font-family="Arial, monospace" font-size="20" font-weight="700" fill="#9CA3AF">next-step --get-access</text>

      <!-- Center Bookmark Prompt Box -->
      <g transform="translate(40, 130)">
        <rect width="900" height="320" rx="28" fill="#1E1035" stroke="#FF007A" stroke-width="3"/>
        <text x="450" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="#FF007A">★ SAVE &amp; BOOKMARK THIS SHORT</text>
        <text x="450" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">Before This AI Tool Gets Patched!</text>
        <text x="450" y="195" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="500" fill="#E2E8F0">Comment "PROMPT" below to get the setup guide</text>
        <rect x="250" y="235" width="400" height="58" rx="20" fill="url(#borderGrad)"/>
        <text x="450" y="272" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF">⚡ COMMENT "PROMPT" BELOW</text>
      </g>

      <!-- Follow Badge Card -->
      <g transform="translate(40, 490)">
        <rect width="900" height="360" rx="28" fill="#0C1B2A" stroke="#00F2FE" stroke-width="3"/>
        <text x="450" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="900" fill="#00F2FE">★ SUBSCRIBE &amp; FOLLOW</text>
        <text x="450" y="125" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF">${handle}</text>
        <text x="450" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="#94A3B8">Daily Breakthrough AI Tools • Prompt Engineering • Tech Hacks</text>

        <!-- Social Proof Stats -->
        <g transform="translate(100, 220)">
          <rect width="210" height="90" rx="18" fill="#1E293B"/>
          <text x="105" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#38EF7D">⚡ Daily</text>
          <text x="105" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#94A3B8">Fresh Tools</text>
        </g>
        <g transform="translate(345, 220)">
          <rect width="210" height="90" rx="18" fill="#1E293B"/>
          <text x="105" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#00F2FE">100% Free</text>
          <text x="105" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#94A3B8">No Paywalls</text>
        </g>
        <g transform="translate(590, 220)">
          <rect width="210" height="90" rx="18" fill="#1E293B"/>
          <text x="105" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#FFB800">★ 4.9/5</text>
          <text x="105" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#94A3B8">Community</text>
        </g>
      </g>
    </g>
    `;
  }
}

export const techVisualProvider = new TechVisualProvider();
