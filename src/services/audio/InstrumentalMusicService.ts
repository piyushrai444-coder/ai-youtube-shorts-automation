import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

export interface InstrumentalTrack {
  id: string;
  title: string;
  style: string;
  filePath: string;
}

export class InstrumentalMusicService {
  private audioDir = path.resolve(process.cwd(), 'public/audio');

  /**
   * Returns list of all available high-quality instrumental tracks.
   */
  getAvailableTracks(): InstrumentalTrack[] {
    const tracks: InstrumentalTrack[] = [
      {
        id: 'cyber_synthwave',
        title: 'Cyber Synthwave Pulse',
        style: 'High-energy cyberpunk synth rhythm',
        filePath: path.join(this.audioDir, 'cyber_synthwave.mp3'),
      },
      {
        id: 'future_tech_pulse',
        title: 'Future Tech Arpeggio',
        style: 'Dynamic electronic tech groove',
        filePath: path.join(this.audioDir, 'future_tech_pulse.mp3'),
      },
      {
        id: 'ambient_tech',
        title: 'Ambient Tech Waves',
        style: 'Sleek futuristic atmosphere',
        filePath: path.join(this.audioDir, 'ambient_tech.mp3'),
      },
      {
        id: 'chill_lofi_beat',
        title: 'Chill Lo-Fi Tech Chords',
        style: 'Smooth mellow tech study vibe',
        filePath: path.join(this.audioDir, 'chill_lofi_beat.mp3'),
      },
    ];

    // Filter to only existing files
    return tracks.filter((t) => fs.existsSync(t.filePath));
  }

  /**
   * Selects an instrumental track, optionally matching preferred mood or style.
   */
  selectTrack(preferredStyle?: string): InstrumentalTrack {
    const available = this.getAvailableTracks();
    if (available.length === 0) {
      // Fallback to ambient_tech path even if not on disk (will be generated or caught)
      return {
        id: 'ambient_tech',
        title: 'Ambient Tech',
        style: 'Futuristic',
        filePath: path.join(this.audioDir, 'ambient_tech.mp3'),
      };
    }

    if (preferredStyle) {
      const match = available.find(
        (t) =>
          t.id.toLowerCase().includes(preferredStyle.toLowerCase()) ||
          t.style.toLowerCase().includes(preferredStyle.toLowerCase())
      );
      if (match) return match;
    }

    // Pick random track for variety across daily shorts
    const randomIndex = Math.floor(Math.random() * available.length);
    const chosen = available[randomIndex];
    logger.debug(`Selected instrumental track: "${chosen.title}" (${chosen.filePath})`);
    return chosen;
  }
}

export const instrumentalMusicService = new InstrumentalMusicService();
