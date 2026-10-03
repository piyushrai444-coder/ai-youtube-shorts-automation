import { GoogleGenerativeAI } from '@google/generative-ai';
import { kidsCharacterManager } from './KidsCharacterManager.js';
import { settingRepository } from '../../repositories/SettingRepository.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import {
  ChoreographyAction,
  LyricSectionItem,
  NurseryContentMode,
  ScoredSongIdea,
  StructuredSongLyrics,
  VideoLengthType,
} from '../../types/index.js';

export class LyricGenerator {
  /**
   * Generates rhythmic, repetitive, preschool-appropriate lyrics structured into musical sections
   * with embedded choreography cues and interactive call-and-response elements.
   */
  async generateLyrics(
    idea: ScoredSongIdea,
    videoType: VideoLengthType = 'SHORT',
    jobId?: string
  ): Promise<StructuredSongLyrics> {
    logger.job(jobId || 'nursery', `Generating structured preschool lyrics for: "${idea.title}" (${videoType})`);

    const bpm = idea.bpm || this.determineBpm((idea.contentMode || 'NURSERY_RHYME') as NurseryContentMode);
    const musicalKey = idea.musicalKey || this.determineKey((idea.contentMode || 'NURSERY_RHYME') as NurseryContentMode);
    const targetDuration = videoType === 'SHORT' ? 45 : 120;

    try {
      const apiKey = (await settingRepository.getSecure('llm_api_key')) || config.llm.apiKey;
      if (apiKey) {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: config.llm.model || 'gemini-3.5-flash-lite' });

        const prompt = `You are an elite children's songwriter and early childhood musical educator.
SONG SPECIFICATION:
Title: "${idea.title}"
Theme: ${idea.theme}
Content Mode: ${idea.contentMode}
Target Age: ${idea.targetAge} (Preschool)
Learning Objective: ${idea.learningObjective}
Characters: ${idea.characters.join(', ')}
Target Duration: Exactly ${targetDuration} seconds (${videoType === 'SHORT' ? '30-60s Short clip' : '90-180s full preschool song'})
Tempo: ${bpm} BPM
Key: ${musicalKey}

SONGWRITING RULES:
1. Repetitive, simple, cheerful preschool lyrics (AABB or AAAA rhyme scheme).
2. Repetitive chorus children can sing along with after hearing once.
3. Include active verbs and physical movements (clap, jump, spin, stomp, wave, touch head).
4. Include interactive call-and-response ("What color is this? RED!", "Can you jump? JUMP!").
5. ZERO copyrighted lyrics or melodies. 100% original.

OUTPUT VALID JSON ONLY with this exact schema:
{
  "title": "${idea.title}",
  "theme": "${idea.theme}",
  "contentMode": "${idea.contentMode}",
  "targetAge": "${idea.targetAge}",
  "learningObjective": "${idea.learningObjective}",
  "bpm": ${bpm},
  "musicalKey": "${musicalKey}",
  "musicStyle": "Preschool Pop",
  "totalDurationSeconds": ${targetDuration},
  "sections": [
    {
      "type": "intro",
      "title": "Fun Opening Chime",
      "startSec": 0,
      "endSec": 5,
      "durationSec": 5,
      "lyrics": "Are you ready to sing and dance? Here we go!",
      "rhymeScheme": "intro",
      "leadCharacter": "${idea.characters[0] || 'Leo'}",
      "choreography": ["WAVE", "BOUNCE"],
      "callAndResponse": {
        "prompt": "Are you ready?",
        "audienceResponse": "YES!"
      },
      "sfxCue": "chime"
    },
    {
      "type": "chorus",
      "title": "Main Sing-Along Chorus",
      "startSec": 5,
      "endSec": 20,
      "durationSec": 15,
      "lyrics": "Red, red, red, look at the train! Choo choo choo, here once again!",
      "rhymeScheme": "AABB",
      "leadCharacter": "${idea.characters[0] || 'Leo'}",
      "choreography": ["CLAP", "JUMP"],
      "sfxCue": "whistle"
    }
  ]
}`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as StructuredSongLyrics;
          if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length >= 3) {
            return this.normalizeLyrics(parsed, idea, targetDuration, bpm, musicalKey);
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[LyricGenerator] LLM lyric generation note: ${err.message}. Using high-retention template.`);
    }

    return this.buildFallbackLyrics(idea, videoType, bpm, musicalKey, targetDuration);
  }

  private determineBpm(mode: NurseryContentMode): number {
    switch (mode) {
      case 'BEDTIME_SONG':
        return 72;
      case 'LEARNING_SONG':
      case 'COUNTING_SONG':
      case 'ABC_SONG':
        return 108;
      case 'ACTION_SONG':
        return 124;
      case 'DANCE_SONG':
        return 132;
      default:
        return 115;
    }
  }

  private determineKey(mode: NurseryContentMode): string {
    switch (mode) {
      case 'BEDTIME_SONG':
        return 'F major';
      case 'DANCE_SONG':
        return 'G major';
      default:
        return 'C major';
    }
  }

  private normalizeLyrics(
    raw: StructuredSongLyrics,
    idea: ScoredSongIdea,
    targetDuration: number,
    bpm: number,
    musicalKey: string
  ): StructuredSongLyrics {
    let currentTime = 0;
    const normalizedSections: LyricSectionItem[] = raw.sections.map((sec, idx) => {
      const dur = Math.max(4, Number(sec.durationSec) || 10);
      const start = currentTime;
      const end = start + dur;
      currentTime = end;

      return {
        type: sec.type || (idx === 0 ? 'intro' : idx % 2 === 1 ? 'chorus' : 'verse'),
        title: sec.title || `Section ${idx + 1}`,
        startSec: start,
        endSec: end,
        durationSec: dur,
        lyrics: (sec.lyrics || '').trim(),
        rhymeScheme: sec.rhymeScheme || 'AABB',
        leadCharacter: sec.leadCharacter || idea.characters[idx % idea.characters.length] || 'Leo',
        choreography: Array.isArray(sec.choreography) && sec.choreography.length > 0 ? sec.choreography : ['CLAP', 'BOUNCE'],
        callAndResponse: sec.callAndResponse || undefined,
        sfxCue: sec.sfxCue || undefined,
      };
    });

    const totalDur = normalizedSections.reduce((sum, s) => sum + (s.durationSec || 5), 0);

    return {
      title: raw.title || idea.title,
      theme: raw.theme || idea.theme,
      contentMode: idea.contentMode,
      targetAge: idea.targetAge,
      learningObjective: idea.learningObjective,
      bpm: raw.bpm || bpm,
      musicalKey: raw.musicalKey || musicalKey,
      musicStyle: raw.musicStyle || 'Preschool Pop',
      sections: normalizedSections,
      totalDurationSeconds: totalDur,
    };
  }

  private buildFallbackLyrics(
    idea: ScoredSongIdea,
    videoType: VideoLengthType,
    bpm: number,
    musicalKey: string,
    targetDuration: number
  ): StructuredSongLyrics {
    const c1 = idea.characters[0] || 'Leo';
    const c2 = idea.characters[1] || 'Mia';
    const c3 = idea.characters[2] || 'Toby';

    const sections: LyricSectionItem[] = [
      {
        type: 'intro',
        title: 'Cheerful Welcome',
        startSec: 0,
        endSec: 5,
        durationSec: 5,
        lyrics: 'Come along, friends! Let us sing and play together! 🎵',
        rhymeScheme: 'intro',
        leadCharacter: c1,
        choreography: ['WAVE', 'BOUNCE'],
        callAndResponse: {
          prompt: 'Are you ready?',
          audienceResponse: 'YES!',
        },
        sfxCue: 'sparkle',
      },
      {
        type: 'chorus',
        title: 'Main Sing-Along Chorus',
        startSec: 5,
        endSec: 18,
        durationSec: 13,
        lyrics: 'Red and yellow, green and blue! Rainbow colors bright and new! Clap your paws and sing it loud, standing tall and feeling proud!',
        rhymeScheme: 'AABB',
        leadCharacter: c1,
        choreography: ['CLAP', 'JUMP'],
        sfxCue: 'chime',
      },
      {
        type: 'verse',
        title: 'Discovery Verse',
        startSec: 18,
        endSec: 30,
        durationSec: 12,
        lyrics: 'Look at the apple, round and red! Look at the sunshine over your head! Point to the grass so fresh and green, prettiest colors you have ever seen!',
        rhymeScheme: 'AABB',
        leadCharacter: c2,
        choreography: ['POINT', 'SPIN'],
        callAndResponse: {
          prompt: 'What color is the apple?',
          audienceResponse: 'RED!',
        },
        sfxCue: 'pop',
      },
      {
        type: 'action_break',
        title: 'Action Dance Break',
        startSec: 28,
        endSec: 35,
        durationSec: 7,
        lyrics: 'Now jump up high! Touch the sky! Spin around once! And freeze!',
        rhymeScheme: 'action',
        leadCharacter: c3,
        choreography: ['JUMP', 'SPIN'],
        sfxCue: 'boing',
      },
      {
        type: 'chorus',
        title: 'Encore Sing-Along Chorus',
        startSec: 35,
        endSec: 41,
        durationSec: 6,
        lyrics: 'Red and yellow, green and blue! Rainbow colors bright and new! Sing it all together now!',
        rhymeScheme: 'AABB',
        leadCharacter: c1,
        choreography: ['CLAP', 'JUMP'],
        sfxCue: 'chime',
      },
      {
        type: 'outro',
        title: 'Celebration Finale',
        startSec: 41,
        endSec: 45,
        durationSec: 4,
        lyrics: 'Yay! Colors everywhere we go! Sing it again with Leo and Mia!',
        rhymeScheme: 'outro',
        leadCharacter: c1,
        choreography: ['CLAP', 'WAVE'],
        sfxCue: 'applause',
      },
    ];

    return {
      title: idea.title,
      theme: idea.theme,
      contentMode: idea.contentMode,
      targetAge: idea.targetAge,
      learningObjective: idea.learningObjective,
      bpm,
      musicalKey,
      musicStyle: 'Preschool Pop',
      sections,
      totalDurationSeconds: 45,
    };
  }
}

export const lyricGenerator = new LyricGenerator();
