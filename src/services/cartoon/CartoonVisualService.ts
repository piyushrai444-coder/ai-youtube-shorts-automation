import sharp from 'sharp';
import { StoryboardSceneItem, VisualResult } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class CartoonVisualService {
  /**
   * Renders 1080x1920 9:16 cartoon scene visuals.
   * Generates vibrant 3D cartoon styled scenes with character avatars, emotional staging,
   * and mobile safe zone compliance.
   */
  async generateCartoonScenes(scenes: StoryboardSceneItem[], storyTitle: string): Promise<VisualResult[]> {
    logger.info(`[CartoonVisualService] Rendering ${scenes.length} 9:16 cartoon scenes for: "${storyTitle}"`);
    const results: VisualResult[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const svg = this.renderCartoonSceneSvg(scene, i + 1, scenes.length, storyTitle);
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 95 })
        .toBuffer();

      results.push({
        sceneIndex: scene.sceneNumber,
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

  private renderCartoonSceneSvg(
    scene: StoryboardSceneItem,
    sceneIndex: number,
    totalScenes: number,
    storyTitle: string
  ): string {
    const width = 1080;
    const height = 1920;
    const charName = scene.characterName || 'Milo';
    const emotion = (scene.emotion || 'happy').toUpperCase();
    const action = scene.action || '';
    const dialogue = scene.dialogue || '';

    // Color palettes based on emotion and mood
    const paletteMap: Record<string, { bg1: string; bg2: string; accent: string; charColor: string }> = {
      EXCITED: { bg1: '#FF7E5F', bg2: '#FEB47B', accent: '#FFE600', charColor: '#FFA726' },
      CONFIDENT: { bg1: '#6A11CB', bg2: '#2575FC', accent: '#00F5D4', charColor: '#42A5F5' },
      SHOCKED: { bg1: '#8E2DE2', bg2: '#4A00E0', accent: '#FF007F', charColor: '#AB47BC' },
      INTENSE: { bg1: '#F85032', bg2: '#E73827', accent: '#FFF200', charColor: '#FF7043' },
      TRIUMPHANT: { bg1: '#11998E', bg2: '#38EF7D', accent: '#FFD700', charColor: '#26A69A' },
      HAPPY: { bg1: '#FBC02D', bg2: '#F57C00', accent: '#FFFFFF', charColor: '#FFA000' },
      WARM: { bg1: '#FF9A8B', bg2: '#FF6A88', accent: '#FFF5EB', charColor: '#FF8A80' },
      MISCHIEVOUS: { bg1: '#4A148C', bg2: '#880E4F', accent: '#00E676', charColor: '#7E57C2' },
    };

    const palette = paletteMap[emotion] || paletteMap.HAPPY;

    // Character specific avatar visuals
    const characterAvatarSvg = this.getCharacterAvatarSvg(charName, palette.charColor);

    // Dialogue text wrapping
    const dialogueLines = this.wrapText(dialogue, 26);
    const actionLines = this.wrapText(`Action: ${action}`, 34);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#F4F4F9" stop-opacity="0.95" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Animated cartoon sunburst / ray background pattern -->
  <g opacity="0.12">
    <circle cx="540" cy="800" r="700" fill="none" stroke="#FFFFFF" stroke-width="60" stroke-dasharray="80 50" />
    <circle cx="540" cy="800" r="500" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-dasharray="60 40" />
    <circle cx="540" cy="800" r="300" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-dasharray="40 30" />
  </g>

  <!-- Top Mobile Safe Header (Above 250px) -->
  <g transform="translate(540, 180)">
    <!-- Series / Channel Badge -->
    <rect x="-260" y="-45" width="520" height="90" rx="45" fill="#000000" fill-opacity="0.35" />
    <text x="0" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">
      ${this.escapeXml(config.branding.channelName.toUpperCase())}
    </text>
  </g>

  <!-- Progress Bar (Scene tracker) -->
  <g transform="translate(140, 260)">
    <rect width="800" height="12" rx="6" fill="#000000" fill-opacity="0.25" />
    <rect width="${(800 * sceneIndex) / totalScenes}" height="12" rx="6" fill="${palette.accent}" filter="url(#glow)" />
  </g>

  <!-- Scene Number & Title Badge -->
  <g transform="translate(540, 340)">
    <rect x="-220" y="-35" width="440" height="70" rx="35" fill="${palette.accent}" filter="url(#shadow)" />
    <text x="0" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#1A1A2E" text-anchor="middle">
      SCENE ${sceneIndex} • ${this.escapeXml(scene.title.toUpperCase())}
    </text>
  </g>

  <!-- Central Visual Character Stage (Y: 420 to 1180) -->
  <g transform="translate(540, 800)" filter="url(#shadow)">
    <!-- Stage Aura -->
    <circle cx="0" cy="0" r="320" fill="#FFFFFF" fill-opacity="0.18" />
    <circle cx="0" cy="0" r="280" fill="#FFFFFF" fill-opacity="0.25" />

    <!-- Character Avatar Art -->
    ${characterAvatarSvg}

    <!-- Emotion Tag Badge -->
    <g transform="translate(0, 240)">
      <rect x="-140" y="-30" width="280" height="60" rx="30" fill="#111827" fill-opacity="0.85" />
      <text x="0" y="8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="${palette.accent}" text-anchor="middle">
        ✨ ${this.escapeXml(emotion)}
      </text>
    </g>
  </g>

  <!-- Dialogue Bubble Card (Y: 1220 to 1540) Mobile Safe Zone -->
  <g transform="translate(100, 1220)" filter="url(#shadow)">
    <rect width="880" height="300" rx="36" fill="url(#cardGrad)" stroke="#FFFFFF" stroke-width="4" />

    <!-- Speaker Name Tag -->
    <g transform="translate(50, -25)">
      <rect width="240" height="56" rx="28" fill="${palette.accent}" filter="url(#shadow)" />
      <text x="120" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#111827" text-anchor="middle">
        🗣️ ${this.escapeXml(charName)}
      </text>
    </g>

    <!-- Dialogue Text -->
    <g transform="translate(60, 75)">
      ${dialogueLines
        .map(
          (line, idx) =>
            `<text x="0" y="${idx * 48}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#1F2937">"${this.escapeXml(
              line
            )}"</text>`
        )
        .join('\n')}
    </g>

    <!-- Subtle SFX Cue if present -->
    ${
      scene.sfxCue
        ? `<g transform="translate(740, 240)">
        <rect x="-80" y="-22" width="160" height="44" rx="22" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="2" />
        <text x="0" y="7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#4B5563" text-anchor="middle">
          🔊 [${this.escapeXml(scene.sfxCue)}]
        </text>
      </g>`
        : ''
    }
  </g>

  <!-- Action Subtitle Note (Y: 1560) -->
  <g transform="translate(540, 1590)">
    ${actionLines
      .map(
        (line, idx) =>
          `<text x="0" y="${idx * 34}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle" filter="url(#shadow)">${this.escapeXml(
            line
          )}</text>`
      )
      .join('\n')}
  </g>

  <!-- Bottom Safe Zone (Keeps clear of YouTube Shorts UI buttons & description) -->
  <g transform="translate(540, 1820)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle" letter-spacing="1">
      ${this.escapeXml(config.branding.watermarkText)}
    </text>
  </g>
</svg>`;
  }

  private getCharacterAvatarSvg(name: string, accentColor: string): string {
    const char = name.toLowerCase();

    if (char.includes('milo')) {
      // Golden puppy with oversized floppy ears & navy blue hoodie
      return `
        <g id="miloAvatar">
          <!-- Navy Blue Hoodie Body -->
          <ellipse cx="0" cy="140" rx="160" ry="110" fill="#1E3A8A" />
          <path d="M -60 70 Q 0 130 60 70" fill="none" stroke="#FBBF24" stroke-width="8" stroke-linecap="round" />
          <circle cx="0" cy="140" r="18" fill="#FBBF24" /> <!-- Paw print -->

          <!-- Head (Golden brown) -->
          <circle cx="0" cy="0" r="130" fill="#D97706" />

          <!-- Floppy Ears -->
          <ellipse cx="-135" cy="10" rx="55" ry="105" fill="#B45309" transform="rotate(-15 -135 10)" />
          <ellipse cx="135" cy="10" rx="55" ry="105" fill="#B45309" transform="rotate(15 135 10)" />

          <!-- Big Amber Eyes -->
          <circle cx="-45" cy="-20" r="30" fill="#FFFFFF" />
          <circle cx="45" cy="-20" r="30" fill="#FFFFFF" />
          <circle cx="-42" cy="-20" r="18" fill="#78350F" />
          <circle cx="42" cy="-20" r="18" fill="#78350F" />
          <circle cx="-36" cy="-26" r="8" fill="#FFFFFF" />
          <circle cx="48" cy="-26" r="8" fill="#FFFFFF" />

          <!-- Cute Snout & Puppy Nose -->
          <ellipse cx="0" cy="35" rx="50" ry="38" fill="#FDE68A" />
          <ellipse cx="0" cy="18" rx="20" ry="14" fill="#1F2937" />
          <path d="M 0 25 L 0 42 Q -22 55 -25 42 M 0 42 Q 22 55 25 42" fill="none" stroke="#1F2937" stroke-width="5" stroke-linecap="round" />
          <path d="M -12 45 Q 0 65 12 45 Z" fill="#F43F5E" /> <!-- Little tongue -->
        </g>
      `;
    }

    if (char.includes('luna')) {
      // Tuxedo kitten with emerald green eyes & red collar with bell
      return `
        <g id="lunaAvatar">
          <!-- Sleek body with white chest -->
          <ellipse cx="0" cy="140" rx="140" ry="100" fill="#111827" />
          <polygon points="0,70 -45,170 45,170" fill="#F9FAFB" />
          <!-- Red collar with gold bell -->
          <rect x="-80" y="60" width="160" height="24" rx="12" fill="#DC2626" />
          <circle cx="0" cy="72" r="16" fill="#FBBF24" />

          <!-- Head (Black with white muzzle) -->
          <circle cx="0" cy="0" r="125" fill="#111827" />

          <!-- Pointed Ears -->
          <polygon points="-110,-40 -120,-130 -40,-90" fill="#111827" />
          <polygon points="-100,-45 -110,-115 -50,-85" fill="#F472B6" />
          <polygon points="110,-40 120,-130 40,-90" fill="#F9FAFB" /> <!-- White tipped ear -->
          <polygon points="100,-45 110,-115 50,-85" fill="#F472B6" />

          <!-- Big Emerald Green Eyes -->
          <ellipse cx="-45" cy="-15" rx="30" ry="35" fill="#10B981" />
          <ellipse cx="45" cy="-15" rx="30" ry="35" fill="#10B981" />
          <ellipse cx="-45" cy="-15" rx="14" ry="30" fill="#064E3B" />
          <ellipse cx="45" cy="-15" rx="14" ry="30" fill="#064E3B" />
          <circle cx="-38" cy="-24" r="8" fill="#FFFFFF" />
          <circle cx="52" cy="-24" r="8" fill="#FFFFFF" />

          <!-- White Muzzle & Pink Nose -->
          <ellipse cx="0" cy="40" rx="42" ry="30" fill="#F9FAFB" />
          <polygon points="0,30 -10,20 10,20" fill="#F472B6" />
          <path d="M 0 30 L 0 40 Q -15 50 -18 42 M 0 40 Q 15 50 18 42" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round" />
        </g>
      `;
    }

    if (char.includes('barnaby')) {
      // Gentle brown bear cub with yellow scarf
      return `
        <g id="barnabyAvatar">
          <!-- Big bear body -->
          <ellipse cx="0" cy="150" rx="180" ry="120" fill="#78350F" />
          <!-- Sunflower yellow scarf -->
          <rect x="-110" y="65" width="220" height="40" rx="20" fill="#EAB308" />
          <rect x="30" y="90" width="40" height="90" rx="10" fill="#CA8A04" />

          <!-- Bear Head -->
          <circle cx="0" cy="0" r="140" fill="#92400E" />

          <!-- Round Fuzzy Ears -->
          <circle cx="-110" cy="-100" r="45" fill="#78350F" />
          <circle cx="-110" cy="-100" r="25" fill="#FDE68A" />
          <circle cx="110" cy="-100" r="45" fill="#78350F" />
          <circle cx="110" cy="-100" r="25" fill="#FDE68A" />

          <!-- Kind Bear Eyes -->
          <circle cx="-50" cy="-25" r="20" fill="#1F2937" />
          <circle cx="50" cy="-25" r="20" fill="#1F2937" />
          <circle cx="-44" cy="-30" r="7" fill="#FFFFFF" />
          <circle cx="56" cy="-30" r="7" fill="#FFFFFF" />

          <!-- Honey Muzzle & Nose -->
          <ellipse cx="0" cy="40" rx="65" ry="48" fill="#FDE68A" />
          <ellipse cx="0" cy="22" rx="28" ry="18" fill="#1F2937" />
          <path d="M 0 32 L 0 52 Q -22 68 -25 54 M 0 52 Q 22 68 25 54" fill="none" stroke="#1F2937" stroke-width="5" stroke-linecap="round" />
        </g>
      `;
    }

    // Default: Pip the blue sparrow or animated creature
    return `
      <g id="genericAvatar">
        <circle cx="0" cy="0" r="130" fill="${accentColor}" />
        <ellipse cx="0" cy="140" rx="140" ry="100" fill="#2563EB" />
        <!-- Aviator Goggles -->
        <rect x="-85" y="-55" width="70" height="45" rx="14" fill="#B45309" stroke="#78350F" stroke-width="6" />
        <rect x="15" y="-55" width="70" height="45" rx="14" fill="#B45309" stroke="#78350F" stroke-width="6" />
        <rect x="-20" y="-40" width="40" height="12" fill="#78350F" />
        <!-- Eyes -->
        <circle cx="-50" cy="5" r="22" fill="#FFFFFF" />
        <circle cx="50" cy="5" r="22" fill="#FFFFFF" />
        <circle cx="-46" cy="5" r="14" fill="#111827" />
        <circle cx="46" cy="5" r="14" fill="#111827" />
        <circle cx="-42" cy="0" r="6" fill="#FFFFFF" />
        <circle cx="50" cy="0" r="6" fill="#FFFFFF" />
        <!-- Yellow Beak -->
        <polygon points="0,55 -28,25 28,25" fill="#FBBF24" />
      </g>
    `;
  }
}

export const cartoonVisualService = new CartoonVisualService();
