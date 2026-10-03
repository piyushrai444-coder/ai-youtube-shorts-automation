import { nurseryIdeaScorer } from '../src/services/nursery/NurseryIdeaScorer.js';
import { kidsCharacterManager, DEFAULT_KIDS_CHARACTERS } from '../src/services/nursery/KidsCharacterManager.js';
import { environmentManager, DEFAULT_ENVIRONMENTS } from '../src/services/nursery/EnvironmentManager.js';
import { lyricGenerator } from '../src/services/nursery/LyricGenerator.js';
import { musicProvider } from '../src/services/nursery/MusicProvider.js';
import { choreographyEngine } from '../src/services/nursery/ChoreographyEngine.js';
import { lipSyncService } from '../src/services/nursery/LipSyncService.js';
import { karaokeSubtitleService } from '../src/services/nursery/KaraokeSubtitleService.js';
import { nurseryQualityGate } from '../src/services/nursery/NurseryQualityGate.js';
import { compilationService } from '../src/services/nursery/CompilationService.js';
import { SongIdeaInput, ScoredSongIdea, StructuredSongLyrics } from '../src/types/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Autonomous AI Nursery Rhymes & Kids Songs Factory', () => {
  describe('NurseryIdeaScorer (12-Factor Preschool Evaluation & Anti-Infringement Gate)', () => {
    it('should score an original preschool action song highly', () => {
      const originalSong: SongIdeaInput = {
        title: 'Clap Your Paws with Leo and Mia',
        theme: 'Counting & Body Movement',
        category: 'ACTION_SONG',
        targetAgeGroup: '2-4',
        educationalConcept: 'Counting from 1 to 5 while clapping and jumping',
        emotionalTone: 'cheerful',
        musicalKey: 'C Major',
        bpm: 116,
        musicStyle: 'preschool_pop',
        characters: ['Leo', 'Mia'],
        environment: 'Rainbow Playground',
        actionMoves: ['CLAP', 'JUMP', 'SPIN'],
        hookLyric: 'One, two, clap your paws! Three, four, jump with Leo roar!',
        targetDurationSeconds: 45,
      };

      const breakdown = nurseryIdeaScorer.scoreSong(originalSong);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(70);
      expect(breakdown.originality).toBeGreaterThanOrEqual(9);
      expect(breakdown.dancePotential).toBeGreaterThanOrEqual(8);
      expect(breakdown.singAlongPotential).toBeGreaterThanOrEqual(7);
      expect(breakdown.rationale).toContain('Total:');
    });

    it('should strictly reject and penalize concepts containing copyrighted children IP', () => {
      const copyrightedSong: SongIdeaInput = {
        title: 'Baby Shark meets Cocomelon in Peppa Pig Garden',
        theme: 'Shark Family',
        category: 'ACTION_SONG',
        targetAgeGroup: '1-3',
        educationalConcept: 'Sharks swimming',
        emotionalTone: 'hyperactive',
        musicalKey: 'G Major',
        bpm: 130,
        musicStyle: 'dance',
        characters: ['Baby Shark', 'Peppa Pig', 'JJ Cocomelon'],
        environment: 'Disney Castle',
        actionMoves: ['CLAP'],
        hookLyric: 'Baby shark doo doo doo with Cocomelon!',
        targetDurationSeconds: 45,
      };

      const breakdown = nurseryIdeaScorer.scoreSong(copyrightedSong);
      expect(breakdown.originality).toBeLessThanOrEqual(5);
      // Hard gate penalty: Final score capped at 20 or below
      expect(breakdown.finalScore).toBeLessThanOrEqual(20);
      expect(breakdown.rationale).toContain('Zero-Tolerance IP Rejection');
    });
  });

  describe('KidsCharacterManager & Preschool Cast Bibles', () => {
    it('should maintain the 5 persistent preschool animal characters with consistent bibles', () => {
      expect(DEFAULT_KIDS_CHARACTERS.length).toBe(5);
      const names = DEFAULT_KIDS_CHARACTERS.map((c: any) => c.name);
      expect(names).toContain('Leo');
      expect(names).toContain('Mia');
      expect(names).toContain('Toby');
      expect(names).toContain('Ella');
      expect(names).toContain('Professor Owl');

      const leo = DEFAULT_KIDS_CHARACTERS.find((c: any) => c.name === 'Leo')!;
      expect(leo.species).toContain('Lion Cub');
      expect(leo.signatureMove).toBe('JUMP');
      expect(leo.signatureItem).toContain('Sunny-yellow t-shirt');

      const mia = DEFAULT_KIDS_CHARACTERS.find((c: any) => c.name === 'Mia')!;
      expect(mia.species).toContain('Bunny');
      expect(mia.signatureMove).toBe('SPIN');
      expect(mia.signatureItem).toContain('Turquoise overalls');
    });

    it('should generate character consistency prompts for 3D visual engines', async () => {
      const prompt = await kidsCharacterManager.buildCharacterConsistencyPrompt(['Leo', 'Mia']);
      expect(prompt).toContain('PRESCHOOL CHARACTER CONSISTENCY BIBLE');
      expect(prompt).toContain('Leo');
      expect(prompt).toContain('Mia');
      expect(prompt).toContain('Sunny-yellow t-shirt');
    });
  });

  describe('EnvironmentManager & Preschool 3D Settings', () => {
    it('should maintain 7 safe, high-engagement preschool 3D environments', () => {
      expect(DEFAULT_ENVIRONMENTS.length).toBe(7);
      const names = DEFAULT_ENVIRONMENTS.map((e: any) => e.name);
      expect(names).toContain('Rainbow Playground');
      expect(names).toContain('Sunny Preschool Classroom');
      expect(names).toContain('Starry Bedtime Room');
      expect(names).toContain('Friendly Sunny Farm');
      expect(names).toContain('Fruit & Color Garden');
      expect(names).toContain('Bubble Bath Studio');
      expect(names).toContain('Rhythm Beach');
    });

    it('should provide environment visual prompt enhancements', async () => {
      const prompt = await environmentManager.buildEnvironmentPrompt('Rainbow Playground');
      expect(prompt).toContain('Rainbow Playground');
      expect(prompt).toContain('pastel rainbow slides');
      expect(prompt).toContain('high preschool engagement');
    });
  });

  describe('LyricGenerator (Structured Preschool Lyrics & Choreography Cues)', () => {
    it('should generate structured preschool lyrics with repeated chorus and action breaks', async () => {
      const songIdea: ScoredSongIdea = {
        title: 'Hop, Hop, Little Bunnies',
        theme: 'Action & Sleeping Bunnies',
        category: 'ACTION_SONG',
        targetAgeGroup: '2-4',
        educationalConcept: 'Learning gentle movement vs fast hopping',
        emotionalTone: 'cheerful',
        musicalKey: 'F Major',
        bpm: 112,
        musicStyle: 'ukulele_clap',
        characters: ['Mia', 'Leo'],
        environment: 'Rainbow Playground',
        actionMoves: ['HOP', 'SPIN', 'CLAP'],
        hookLyric: 'Hop, hop, hop like a happy little bunny!',
        targetDurationSeconds: 45,
        totalScore: 88,
        scoreBreakdown: {
          educationalValue: 9,
          singAlongPotential: 9,
          memorability: 9,
          repetitionPotential: 9,
          visualPotential: 9,
          characterAppeal: 9,
          dancePotential: 9,
          parentUsefulness: 8,
          childParticipation: 9,
          originality: 9,
          trendRelevance: 8,
          replayPotential: 9,
          finalScore: 88,
          rationale: 'Top score',
        },
      };

      const lyrics = await lyricGenerator.generateLyrics(songIdea);
      expect(lyrics).toBeDefined();
      expect(lyrics.title).toBe(songIdea.title);
      expect(lyrics.sections.length).toBeGreaterThanOrEqual(4);

      // Verify chorus is repeated for earworm preschool retention
      const chorusSections = lyrics.sections.filter((s) => s.type === 'chorus');
      expect(chorusSections.length).toBeGreaterThanOrEqual(2);

      // Verify action break exists with movement cues
      const actionSection = lyrics.sections.find((s) => s.type === 'action_break');
      expect(actionSection).toBeDefined();
      expect(actionSection?.actions?.length || actionSection?.choreography?.length).toBeGreaterThan(0);
    });
  });

  describe('MusicProvider (Melodic Synthesizer & Backing Tracks)', () => {
    it('should generate a 44.1kHz melodic backing track with chords and percussion', async () => {
      const track = await musicProvider.generateMusicTrack('C Major', 120, 'preschool_pop', 15);
      expect(track).toBeDefined();
      expect(track.bpm).toBe(120);
      expect(track.musicalKey).toBe('C Major');
      expect(track.audioBuffer.length).toBeGreaterThan(1000);
      // WAV header starts with 'RIFF'
      expect(track.audioBuffer.toString('ascii', 0, 4)).toBe('RIFF');
    });
  });

  describe('ChoreographyEngine & LipSyncService', () => {
    it('should schedule character dance movements aligned to musical BPM downbeats', () => {
      const timeline = choreographyEngine.generateChoreography(
        ['CLAP', 'JUMP', 'SPIN'],
        120, // 120 BPM = 2 beats per second (1 beat = 0.5s)
        20
      );

      expect(timeline.beats.length).toBeGreaterThanOrEqual(3);
      expect(timeline.beats[0].timeSec).toBeLessThan(timeline.beats[1].timeSec);
      expect(['CLAP', 'JUMP', 'SPIN', 'WAVE']).toContain(timeline.beats[0].action);
    });

    it('should extract phonemes and provide lip-sync visemes and mouth SVGs', () => {
      const visemes = lipSyncService.extractVisemes('Hello little red bunnies jump and sing');
      expect(visemes.length).toBeGreaterThan(5);

      const visemeTypes = visemes.map((v: any) => v.viseme);
      expect(visemeTypes).toContain('E');

      const svgMouth = lipSyncService.getMouthSvg('O');
      expect(svgMouth).toContain('<ellipse');
      expect(svgMouth).toContain('fill=');
    });
  });

  describe('KaraokeSubtitleService', () => {
    it('should produce large sing-along karaoke subtitles with musical emojis', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'karaoke_test_'));
      const srtPath = path.join(tmpDir, 'test.srt');

      const mockLyrics: StructuredSongLyrics = {
        title: 'Sing with Mia',
        theme: 'Singing',
        bpm: 110,
        musicalKey: 'C Major',
        musicStyle: 'preschool_pop',
        totalDurationSeconds: 10,
        sections: [
          {
            type: 'chorus',
            title: 'Chorus',
            lyrics: 'Sing, sing, sing with me! Happy little melody!',
            leadCharacter: 'Mia',
            choreography: ['CLAP'],
            startSec: 0,
            endSec: 10,
            durationSec: 10,
          },
        ],
      };

      await karaokeSubtitleService.generateKaraokeSrt(mockLyrics, 10, srtPath);
      expect(fs.existsSync(srtPath)).toBe(true);

      const content = await fs.promises.readFile(srtPath, 'utf-8');
      expect(content).toContain('-->');
      expect(content).toContain('Sing, sing, sing with me!');
      expect(content).toContain('🎵');

      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });
  });

  describe('NurseryQualityGate (Strict Preschool Benchmarks)', () => {
    it('should reject songs violating copyright or containing inappropriate terms', async () => {
      const mockBadLyrics: StructuredSongLyrics = {
        title: 'Scary Monster Fight with Cocomelon',
        theme: 'Fighting',
        bpm: 110,
        musicalKey: 'C Major',
        musicStyle: 'preschool_pop',
        totalDurationSeconds: 45,
        sections: [
          {
            type: 'chorus',
            title: 'Chorus',
            leadCharacter: 'Leo',
            lines: ['Fight the scary monster with cocomelon!'],
            lyrics: 'Fight the scary monster with cocomelon!',
            choreography: ['CLAP'],
          },
        ],
      };

      const result = await nurseryQualityGate.validateNurseryVideo({
        videoPath: '/tmp/non_existent.mp4',
        title: 'Scary Monster Fight with Cocomelon',
        lyrics: mockBadLyrics,
        characters: ['Unknown Monster'],
        bpm: 110,
        videoType: 'SHORT',
      });

      expect(result.passed).toBe(false);
      expect(result.originalityVerified).toBe(false);
      expect(result.madeForKidsCompliant).toBe(false);
      expect(result.issues.some((i) => i.includes('cocomelon'))).toBe(true);
      expect(result.issues.some((i) => i.includes('scary') || i.includes('fight'))).toBe(true);
    });
  });

  describe('CompilationService', () => {
    it('should format chapter timestamps accurately', () => {
      const formatFn = (compilationService as any).formatTimestamp.bind(compilationService);
      expect(formatFn(0)).toBe('00:00');
      expect(formatFn(65)).toBe('01:05');
      expect(formatFn(3665)).toBe('01:01:05');
    });
  });
});
