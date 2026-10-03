import { LipSyncViseme, LyricSectionItem } from '../../types/index.js';

export interface VisemeEvent {
  timeSec: number;
  durationSec: number;
  viseme: LipSyncViseme;
  word: string;
}

export class LipSyncService {
  /**
   * Extracts phoneme-aligned mouth visemes for each word in the lyrics.
   */
  generateVisemeTimeline(sections: LyricSectionItem[]): VisemeEvent[] {
    const events: VisemeEvent[] = [];

    for (const section of sections) {
      const text = section.lyrics || (section.lines ? section.lines.join(' ') : '');
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      const durationSec = section.durationSec || 5;
      const startSec = section.startSec || 0;
      const timePerWord = durationSec / words.length;

      for (let w = 0; w < words.length; w++) {
        const word = words[w].replace(/[^a-zA-Z]/g, '').toLowerCase();
        const wordStart = startSec + w * timePerWord;
        const viseme = this.mapWordToPrimaryViseme(word);

        events.push({
          timeSec: Number(wordStart.toFixed(2)),
          durationSec: Number(timePerWord.toFixed(2)),
          viseme,
          word: words[w],
        });
      }
    }

    return events;
  }

  /**
   * Returns clean, expressive 3D cartoon SVG mouth paths for each viseme mouth posture.
   */
  getVisemeSvg(viseme: LipSyncViseme, fillColor: string = '#1E1B4B', tongueColor: string = '#F43F5E'): string {
    switch (viseme) {
      case 'A': // Big open mouth
        return `
          <g id="viseme-A">
            <ellipse cx="0" cy="48" rx="34" ry="24" fill="${fillColor}" />
            <path d="M -18 54 Q 0 68 18 54 Z" fill="${tongueColor}" />
            <rect x="-18" y="26" width="36" height="6" rx="3" fill="#FFFFFF" />
          </g>
        `;
      case 'E': // Wide smiling teeth mouth
        return `
          <g id="viseme-E">
            <ellipse cx="0" cy="46" rx="38" ry="14" fill="${fillColor}" />
            <rect x="-24" y="38" width="48" height="7" rx="3" fill="#FFFFFF" />
          </g>
        `;
      case 'O': // Round circle "O" mouth
        return `
          <g id="viseme-O">
            <circle cx="0" cy="48" r="20" fill="${fillColor}" />
            <ellipse cx="0" cy="56" rx="12" ry="7" fill="${tongueColor}" />
          </g>
        `;
      case 'U': // Small pursed whistling circle
        return `
          <g id="viseme-U">
            <circle cx="0" cy="48" r="13" fill="${fillColor}" />
          </g>
        `;
      case 'MBP': // Pressed closed lips
        return `
          <g id="viseme-MBP">
            <path d="M -26 46 Q 0 49 26 46" fill="none" stroke="${fillColor}" stroke-width="6" stroke-linecap="round" />
          </g>
        `;
      case 'FV': // Lower lip under teeth
        return `
          <g id="viseme-FV">
            <ellipse cx="0" cy="46" rx="28" ry="10" fill="${fillColor}" />
            <rect x="-18" y="38" width="36" height="6" rx="3" fill="#FFFFFF" />
          </g>
        `;
      case 'SZ': // Smiling clenched teeth
        return `
          <g id="viseme-SZ">
            <ellipse cx="0" cy="46" rx="34" ry="12" fill="${fillColor}" />
            <rect x="-22" y="39" width="44" height="8" rx="2" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
          </g>
        `;
      case 'L': // Tongue visible
        return `
          <g id="viseme-L">
            <ellipse cx="0" cy="48" rx="30" ry="18" fill="${fillColor}" />
            <circle cx="0" cy="40" r="10" fill="${tongueColor}" />
          </g>
        `;
      case 'REST':
      default: // Happy closed smile
        return `
          <g id="viseme-REST">
            <path d="M -22 44 Q 0 58 22 44" fill="none" stroke="${fillColor}" stroke-width="5" stroke-linecap="round" />
          </g>
        `;
    }
  }

  private mapWordToPrimaryViseme(word: string): LipSyncViseme {
    if (word.startsWith('m') || word.startsWith('b') || word.startsWith('p')) return 'MBP';
    if (word.startsWith('f') || word.startsWith('v')) return 'FV';
    if (word.startsWith('s') || word.startsWith('z') || word.startsWith('c')) return 'SZ';
    if (word.startsWith('l') || word.startsWith('d') || word.startsWith('t')) return 'L';
    if (word.includes('oo') || word.includes('u') || word.includes('ew')) return 'U';
    if (word.includes('o') || word.includes('aw')) return 'O';
    if (word.includes('ee') || word.includes('ea') || word.includes('e') || word.includes('i')) return 'E';
    return 'A';
  }

  extractVisemes(text: string): { viseme: LipSyncViseme; word: string }[] {
    const words = text.split(/\s+/).filter(Boolean);
    return words.map((w) => {
      const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
      return {
        word: w,
        viseme: this.mapWordToPrimaryViseme(clean),
      };
    });
  }

  getMouthSvg(viseme: LipSyncViseme): string {
    return this.getVisemeSvg(viseme);
  }
}

export const lipSyncService = new LipSyncService();
