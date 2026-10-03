import sharp from 'sharp';
import { environmentManager } from './EnvironmentManager.js';
import { kidsCharacterManager } from './KidsCharacterManager.js';
import { lipSyncService } from './LipSyncService.js';
import {
  AspectRatioType,
  ChoreographyAction,
  EnvironmentProfile,
  KidsCharacterProfile,
  LipSyncViseme,
  LyricSectionItem,
  StructuredSongLyrics,
  VisualResult,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class NurseryVisualService {
  /**
   * Renders 3D preschool musical animation frames across all song sections.
   * Supports both 9:16 (Shorts) and 16:9 (Standard Widescreen).
   */
  async generateSongScenes(
    lyrics: StructuredSongLyrics,
    aspectRatio: AspectRatioType = '9:16'
  ): Promise<VisualResult[]> {
    logger.info(
      `[NurseryVisualService] Rendering ${lyrics.sections.length} preschool scenes for "${lyrics.title}" (${aspectRatio})...`
    );

    const environment = environmentManager.selectEnvironmentForTheme(lyrics.theme, lyrics.contentMode || 'NURSERY_RHYME');
    const results: VisualResult[] = [];

    const isVertical = aspectRatio === '9:16';
    const width = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;

    for (let i = 0; i < lyrics.sections.length; i++) {
      const section = lyrics.sections[i];
      const leadName = section.leadCharacter || section.singer || 'Leo';
      const leadChar = (await kidsCharacterManager.getKidsCharacter(leadName)) ||
        (await kidsCharacterManager.getAllKidsCharacters())[0];

      const svg = this.renderPreschoolSceneSvg(
        section,
        leadChar,
        environment,
        i + 1,
        lyrics.sections.length,
        width,
        height,
        isVertical,
        lyrics.title
      );

      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 95 })
        .toBuffer();

      results.push({
        sceneIndex: i + 1,
        imageBuffer: pngBuffer,
        durationSeconds: section.durationSec || 5,
      });
    }

    return results;
  }

  async generateSongVisuals(
    lyrics: StructuredSongLyrics,
    characters: string[],
    environmentName: string,
    totalDuration: number,
    aspectRatio: AspectRatioType = '9:16',
    jobId?: string
  ): Promise<VisualResult[]> {
    return this.generateSongScenes(lyrics, aspectRatio);
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private wrapText(text: string, maxCharsPerLine: number = 30): string[] {
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

  private renderPreschoolSceneSvg(
    section: LyricSectionItem,
    character: KidsCharacterProfile,
    environment: EnvironmentProfile,
    sectionIndex: number,
    totalSections: number,
    width: number,
    height: number,
    isVertical: boolean,
    songTitle: string
  ): string {
    const action: ChoreographyAction = section.choreography?.[0] || 'BOUNCE';
    const viseme: LipSyncViseme = (section.type === 'action_break' ? 'A' : 'E');
    const mouthSvg = lipSyncService.getVisemeSvg(viseme);

    // Dynamic character positioning based on aspect ratio
    const charCenterX = width / 2;
    const charCenterY = isVertical ? 860 : 540;

    // Character vector avatar
    const characterAvatarSvg = this.renderKidsCharacterSvg(character, action, mouthSvg);

    // Environment specific backdrops
    const environmentSvg = this.renderEnvironmentSvg(environment, width, height);

    // Sing-along lyrics text
    const rawLyrics = section.lyrics || (section.lines ? section.lines.join(' ') : '');
    const lyricLines = this.wrapText(rawLyrics, isVertical ? 24 : 45);

    // Action banner badge
    const actionBadgeText = section.callAndResponse
      ? `🗣️ ${section.callAndResponse.prompt} → ${section.callAndResponse.audienceResponse}`
      : `🎵 ${action}! 🎵`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.30" />
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.96" />
      <stop offset="100%" stop-color="#FFFBEB" stop-opacity="0.96" />
    </linearGradient>
  </defs>

  <!-- Environment Background -->
  ${environmentSvg}

  <!-- Floating Cheerful Musical Notes -->
  <g opacity="0.35" fill="#FFFFFF">
    <text x="${width * 0.12}" y="${height * 0.22}" font-size="${isVertical ? 48 : 40}">🎵</text>
    <text x="${width * 0.85}" y="${height * 0.26}" font-size="${isVertical ? 56 : 46}">🎶</text>
    <text x="${width * 0.18}" y="${height * 0.65}" font-size="${isVertical ? 42 : 36}">⭐</text>
    <text x="${width * 0.82}" y="${height * 0.68}" font-size="${isVertical ? 48 : 40}">✨</text>
  </g>

  <!-- Top Sing-Along Song Header Banner -->
  <g transform="translate(${width / 2}, ${isVertical ? 150 : 80})">
    <rect x="-300" y="-35" width="600" height="70" rx="35" fill="#1E1B4B" fill-opacity="0.65" />
    <text x="0" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${isVertical ? 26 : 22}" font-weight="900" fill="#FDE047" text-anchor="middle" letter-spacing="1">
      🎵 ${this.escapeXml(songTitle.toUpperCase())}
    </text>
  </g>

  <!-- Musical Section Tracker Bar -->
  <g transform="translate(${width * 0.1}, ${isVertical ? 210 : 130})">
    <rect width="${width * 0.8}" height="10" rx="5" fill="#000000" fill-opacity="0.25" />
    <rect width="${(width * 0.8 * sectionIndex) / totalSections}" height="10" rx="5" fill="#FDE047" filter="url(#glow)" />
  </g>

  <!-- Central Preschool Character Stage -->
  <g transform="translate(${charCenterX}, ${charCenterY})" filter="url(#shadow)">
    <!-- Stage Halo Ring -->
    <circle cx="0" cy="0" r="280" fill="#FFFFFF" fill-opacity="0.18" />
    <circle cx="0" cy="0" r="250" fill="#FFFFFF" fill-opacity="0.24" />

    <!-- Character Avatar Art with active choreography and lip-sync -->
    ${characterAvatarSvg}

    <!-- Choreography Action Badge -->
    <g transform="translate(0, 230)">
      <rect x="-160" y="-28" width="320" height="56" rx="28" fill="#F59E0B" filter="url(#shadow)" />
      <text x="0" y="8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#1E1B4B" text-anchor="middle">
        ${this.escapeXml(actionBadgeText)}
      </text>
    </g>
  </g>

  <!-- Large Karaoke Sing-Along Lyrics Card (Mobile Safe Zone) -->
  <g transform="translate(${width * 0.08}, ${isVertical ? 1240 : 760})" filter="url(#shadow)">
    <rect width="${width * 0.84}" height="${isVertical ? 320 : 220}" rx="32" fill="url(#cardGrad)" stroke="#FDE047" stroke-width="4" />

    <!-- Singing Lead Badge -->
    <g transform="translate(40, -22)">
      <rect width="260" height="48" rx="24" fill="#3B82F6" filter="url(#shadow)" />
      <text x="130" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle">
        🎤 Sing with ${this.escapeXml(character.name)}
      </text>
    </g>

    <!-- Lyrics Text with Musical Notes -->
    <g transform="translate(50, ${isVertical ? 70 : 60})">
      ${lyricLines
        .map(
          (line, idx) =>
            `<text x="0" y="${idx * (isVertical ? 46 : 38)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${isVertical ? 34 : 28}" font-weight="900" fill="#1E1B4B">"${this.escapeXml(
              line
            )}"</text>`
        )
        .join('\n')}
    </g>
  </g>

  <!-- Bottom Brand Watermark -->
  <g transform="translate(${width / 2}, ${height - (isVertical ? 80 : 35)})">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" fill-opacity="0.80" text-anchor="middle" letter-spacing="1">
      🌟 ORIGINAL PRESCHOOL NURSERY RHYMES • MADE FOR KIDS
    </text>
  </g>
</svg>`;
  }

  private renderEnvironmentSvg(env: EnvironmentProfile, width: number, height: number): string {
    const { primary, secondary, accent } = env.colorTheme;

    return `
      <!-- Sky / Room Gradient -->
      <defs>
        <linearGradient id="envSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${secondary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#envSky)" />

      <!-- Giant Rainbow Arc in Sky -->
      <g opacity="0.45">
        <circle cx="${width / 2}" cy="${height * 0.9}" r="${height * 0.75}" fill="none" stroke="#EF4444" stroke-width="24" />
        <circle cx="${width / 2}" cy="${height * 0.9}" r="${height * 0.75 - 24}" fill="none" stroke="#F59E0B" stroke-width="24" />
        <circle cx="${width / 2}" cy="${height * 0.9}" r="${height * 0.75 - 48}" fill="none" stroke="#10B981" stroke-width="24" />
        <circle cx="${width / 2}" cy="${height * 0.9}" r="${height * 0.75 - 72}" fill="none" stroke="#3B82F6" stroke-width="24" />
        <circle cx="${width / 2}" cy="${height * 0.9}" r="${height * 0.75 - 96}" fill="none" stroke="#8B5CF6" stroke-width="24" />
      </g>

      <!-- Soft Fluffy White Clouds -->
      <g fill="#FFFFFF" fill-opacity="0.75">
        <ellipse cx="${width * 0.2}" cy="${height * 0.18}" rx="120" ry="60" />
        <ellipse cx="${width * 0.28}" cy="${height * 0.15}" rx="90" ry="70" />
        <ellipse cx="${width * 0.8}" cy="${height * 0.22}" rx="140" ry="65" />
        <ellipse cx="${width * 0.72}" cy="${height * 0.19}" rx="100" ry="75" />
      </g>

      <!-- Rolling Green Preschool Ground Hills -->
      <path d="M 0 ${height * 0.72} Q ${width * 0.35} ${height * 0.62} ${width * 0.7} ${height * 0.75} T ${width} ${height * 0.70} L ${width} ${height} L 0 ${height} Z" fill="${primary}" />
      <path d="M 0 ${height * 0.78} Q ${width * 0.5} ${height * 0.70} ${width} ${height * 0.82} L ${width} ${height} L 0 ${height} Z" fill="${primary}" fill-opacity="0.85" />
    `;
  }

  private renderKidsCharacterSvg(
    character: KidsCharacterProfile,
    action: ChoreographyAction,
    mouthSvg: string
  ): string {
    const name = character.name.toLowerCase();

    // 1. Leo the Lion Cub
    if (name.includes('leo')) {
      const armOffset = action === 'JUMP' || action === 'WAVE' ? -60 : 0;
      return `
        <g id="leoCharacter">
          <!-- Body in Sunny Yellow T-Shirt -->
          <ellipse cx="0" cy="130" rx="150" ry="110" fill="#FBBF24" />
          <ellipse cx="0" cy="135" rx="130" ry="90" fill="#FEF08A" /> <!-- Sun on chest -->
          <circle cx="0" cy="135" r="30" fill="#F59E0B" />
          <circle cx="0" cy="135" r="16" fill="#EF4444" />

          <!-- Fluffy Lion Mane -->
          <circle cx="0" cy="-10" r="150" fill="#D97706" />

          <!-- Golden Lion Head -->
          <circle cx="0" cy="0" r="120" fill="#FBBF24" />

          <!-- Round Lion Ears with Pink Insets -->
          <circle cx="-100" cy="-90" r="38" fill="#FBBF24" />
          <circle cx="-100" cy="-90" r="22" fill="#F472B6" />
          <circle cx="100" cy="-90" r="38" fill="#FBBF24" />
          <circle cx="100" cy="-90" r="22" fill="#F472B6" />

          <!-- Big Amber Preschool Eyes -->
          <ellipse cx="-42" cy="-20" rx="26" ry="32" fill="#FFFFFF" />
          <ellipse cx="42" cy="-20" rx="26" ry="32" fill="#FFFFFF" />
          <circle cx="-38" cy="-20" r="16" fill="#78350F" />
          <circle cx="46" cy="-20" r="16" fill="#78350F" />
          <circle cx="-32" cy="-26" r="7" fill="#FFFFFF" />
          <circle cx="52" cy="-26" r="7" fill="#FFFFFF" />

          <!-- Snout & Nose -->
          <ellipse cx="0" cy="28" rx="42" ry="28" fill="#FEF08A" />
          <polygon points="0,22 -14,10 14,10" fill="#78350F" />

          <!-- Dynamic Lip-Synced Mouth -->
          ${mouthSvg}

          <!-- Paws (dancing pose) -->
          <circle cx="-130" cy="${80 + armOffset}" r="32" fill="#FBBF24" />
          <circle cx="130" cy="${80 + armOffset}" r="32" fill="#FBBF24" />
        </g>
      `;
    }

    // 2. Mia the Bunny
    if (name.includes('mia')) {
      return `
        <g id="miaCharacter">
          <!-- Turquoise Overalls Body -->
          <ellipse cx="0" cy="140" rx="140" ry="105" fill="#2DD4BF" />
          <rect x="-60" y="80" width="120" height="90" rx="16" fill="#14B8A6" />
          <circle cx="0" cy="115" r="16" fill="#FDE047" /> <!-- Daisy Button -->

          <!-- Long Bunny Ears -->
          <ellipse cx="-55" cy="-140" rx="32" ry="110" fill="#FFFFFF" transform="rotate(-10 -55 -140)" />
          <ellipse cx="-55" cy="-140" rx="18" ry="85" fill="#F472B6" transform="rotate(-10 -55 -140)" />
          <ellipse cx="55" cy="-140" rx="32" ry="110" fill="#FFFFFF" transform="rotate(10 55 -140)" />
          <ellipse cx="55" cy="-140" rx="18" ry="85" fill="#F472B6" transform="rotate(10 55 -140)" />

          <!-- White Bunny Head -->
          <circle cx="0" cy="0" r="120" fill="#FFFFFF" />

          <!-- Emerald Eyes with Lashes -->
          <ellipse cx="-40" cy="-15" rx="24" ry="30" fill="#FFFFFF" />
          <ellipse cx="40" cy="-15" rx="24" ry="30" fill="#FFFFFF" />
          <circle cx="-38" cy="-15" r="15" fill="#0D9488" />
          <circle cx="42" cy="-15" r="15" fill="#0D9488" />
          <circle cx="-32" cy="-22" r="6" fill="#FFFFFF" />
          <circle cx="48" cy="-22" r="6" fill="#FFFFFF" />

          <!-- Pink Nose -->
          <ellipse cx="0" cy="22" rx="12" ry="9" fill="#F472B6" />

          <!-- Dynamic Lip-Synced Mouth -->
          ${mouthSvg}

          <!-- Paws -->
          <circle cx="-120" cy="110" r="28" fill="#FFFFFF" />
          <circle cx="120" cy="110" r="28" fill="#FFFFFF" />
        </g>
      `;
    }

    // Default: Toby the Turtle or friendly preschool creature
    return `
      <g id="tobyCharacter">
        <!-- Shell -->
        <ellipse cx="0" cy="130" rx="160" ry="115" fill="#0D9488" />
        <ellipse cx="0" cy="130" rx="130" ry="85" fill="#14B8A6" />
        <!-- Head -->
        <circle cx="0" cy="0" r="115" fill="#4ADE80" />
        <!-- Explorer Cap -->
        <ellipse cx="0" cy="-85" rx="85" ry="32" fill="#1E3A8A" />
        <circle cx="0" cy="-105" r="14" fill="#F59E0B" />
        <!-- Eyes -->
        <circle cx="-38" cy="-15" r="24" fill="#FFFFFF" />
        <circle cx="38" cy="-15" r="24" fill="#FFFFFF" />
        <circle cx="-36" cy="-15" r="14" fill="#1E293B" />
        <circle cx="40" cy="-15" r="14" fill="#1E293B" />
        <!-- Dynamic Lip-Synced Mouth -->
        ${mouthSvg}
      </g>
    `;
  }
}

export const nurseryVisualService = new NurseryVisualService();
