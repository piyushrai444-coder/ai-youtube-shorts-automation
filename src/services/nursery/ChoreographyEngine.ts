import { ChoreographyAction, StructuredSongLyrics } from '../../types/index.js';

export interface ChoreographyBeatItem {
  timeSec: number;
  beatNumber: number;
  action: ChoreographyAction;
  character: string;
  calloutText?: string;
  intensity: 'soft' | 'medium' | 'high';
}

export interface ChoreographyTimeline {
  bpm: number;
  secondsPerBeat: number;
  totalBeats: number;
  beats: ChoreographyBeatItem[];
}

export class ChoreographyEngine {
  /**
   * Translates structured lyrics and song BPM into a beat-synchronized dance and action timeline.
   */
  generateChoreography(
    lyricsOrActions: StructuredSongLyrics | ChoreographyAction[],
    bpmInput: number = 115,
    durationInput: number = 20
  ): ChoreographyTimeline {
    if (Array.isArray(lyricsOrActions)) {
      const bpm = bpmInput || 115;
      const secondsPerBeat = 60 / bpm;
      const beats: ChoreographyBeatItem[] = [];
      const totalBeats = Math.floor(durationInput / secondsPerBeat);

      for (let b = 0; b < totalBeats; b++) {
        const timeSec = Number((b * secondsPerBeat).toFixed(2));
        const action = lyricsOrActions[b % lyricsOrActions.length] || 'CLAP';
        beats.push({
          timeSec,
          beatNumber: b,
          action,
          character: 'Lead',
          intensity: b % 2 === 0 ? 'high' : 'medium',
        });
      }

      return {
        bpm,
        secondsPerBeat,
        totalBeats,
        beats,
      };
    }

    const lyrics = lyricsOrActions;
    const bpm = lyrics.bpm || 115;
    const secondsPerBeat = 60 / bpm;
    const beats: ChoreographyBeatItem[] = [];

    let currentBeat = 0;

    for (const section of lyrics.sections) {
      const sectionStart = section.startSec ?? 0;
      const sectionEnd = section.endSec ?? (sectionStart + (section.durationSec ?? 5));
      const sectionDuration = sectionEnd - sectionStart;
      const beatsInSection = Math.max(1, Math.floor(sectionDuration / secondsPerBeat));

      const actionList: ChoreographyAction[] = (section.choreography && section.choreography.length > 0)
        ? section.choreography
        : (section.actions && section.actions.length > 0)
          ? section.actions
          : ['CLAP', 'BOUNCE'];

      for (let b = 0; b < beatsInSection; b++) {
        const timeSec = Number((sectionStart + b * secondsPerBeat).toFixed(2));
        const action = actionList[b % actionList.length];
        const isAccentBeat = b % 2 === 0;

        let callout: string | undefined;
        if (section.type === 'action_break' && b % 2 === 0) {
          callout = action;
        } else if (section.callAndResponse && b === 0) {
          callout = section.callAndResponse.prompt;
        }

        beats.push({
          timeSec,
          beatNumber: currentBeat++,
          action,
          character: section.leadCharacter || section.singer || 'Lead',
          calloutText: callout,
          intensity: isAccentBeat ? 'high' : 'medium',
        });
      }
    }

    return {
      bpm,
      secondsPerBeat,
      totalBeats: currentBeat,
      beats,
    };
  }
}

export const choreographyEngine = new ChoreographyEngine();
