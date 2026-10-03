import { storyScorer } from '../src/services/cartoon/StoryScorer.js';
import { fatigueDetector } from '../src/services/cartoon/FatigueDetector.js';
import { characterManager, DEFAULT_CHARACTERS } from '../src/services/cartoon/CharacterManager.js';
import { cartoonScriptGenerator } from '../src/services/cartoon/CartoonScriptGenerator.js';
import { cartoonQualityGate } from '../src/services/cartoon/CartoonQualityGate.js';
import { cartoonVisualService } from '../src/services/cartoon/CartoonVisualService.js';
import { ScoredStoryIdea, StoryIdeaInput } from '../src/types/index.js';

describe('Autonomous AI Cartoon Shorts Factory', () => {
  describe('StoryScorer (8-factor evaluation & Originality Gate)', () => {
    it('should score an original funny cartoon concept highly', () => {
      const originalIdea: StoryIdeaInput = {
        title: "Milo's Epic Pancake Flip",
        concept: "Milo attempts an epic chef-style pancake flip to impress Luna, but the pancake vanishes onto the ceiling.",
        format: 'FUNNY_MISUNDERSTANDING',
        genre: 'COMEDY',
        audience: 'FAMILY',
        suggestedCharacters: ['Milo', 'Luna'],
        hookSceneDescription: "Milo wearing a giant chef hat looks up in sheer panic as a golden pancake sizzles mid-air.",
        twistOrPayoff: "Luna quietly places a plate on her head right before the pancake drops perfectly into place.",
        moralLesson: 'Teamwork makes the breakfast work.',
      };

      const breakdown = storyScorer.scoreStory(originalIdea);
      expect(breakdown.finalScore).toBeGreaterThanOrEqual(70);
      expect(breakdown.originalityScore).toBeGreaterThanOrEqual(9);
      expect(breakdown.hookPower).toBeGreaterThanOrEqual(7);
      expect(breakdown.humorSurprise).toBeGreaterThanOrEqual(8);
      expect(breakdown.rationale).toContain('Hook:');
    });

    it('should strictly penalize and reject concepts containing copyrighted IP', () => {
      const ipInfringingIdea: StoryIdeaInput = {
        title: "Mickey Mouse and Pikachu find a secret box",
        concept: "Mickey Mouse and Pikachu sneak into Disney castle to battle Batman.",
        format: 'MINI_ADVENTURE',
        genre: 'ADVENTURE',
        audience: 'FAMILY',
        suggestedCharacters: ['Mickey', 'Pikachu'],
        hookSceneDescription: "Pikachu uses thunderbolt on Disney castle gate.",
        twistOrPayoff: "Batman appears and saves the day.",
      };

      const breakdown = storyScorer.scoreStory(ipInfringingIdea);
      expect(breakdown.originalityScore).toBeLessThan(7);
      // Hard gate penalty: Final score capped at 20 or below
      expect(breakdown.finalScore).toBeLessThanOrEqual(20);
    });
  });

  describe('CharacterManager & Consistency Prompts', () => {
    it('should have initial persistent cast defined with distinct traits and bibles', () => {
      expect(DEFAULT_CHARACTERS.length).toBe(4);
      const names = DEFAULT_CHARACTERS.map((c) => c.name);
      expect(names).toContain('Milo');
      expect(names).toContain('Luna');
      expect(names).toContain('Barnaby');
      expect(names).toContain('Pip');

      // Verify locked traits
      const milo = DEFAULT_CHARACTERS.find((c) => c.name === 'Milo')!;
      expect(milo.bible).toContain('navy-blue hooded sweatshirt');
      expect(milo.voiceProfile.voiceName).toBe('en-US-AnaNeural');

      const luna = DEFAULT_CHARACTERS.find((c) => c.name === 'Luna')!;
      expect(luna.bible).toContain('emerald-green eyes');
      expect(luna.voiceProfile.voiceName).toBe('en-US-JennyNeural');
    });

    it('should build character consistency prompts for visual engines', async () => {
      const prompt = await characterManager.buildCharacterConsistencyPrompt(['Milo', 'Luna']);
      expect(prompt).toContain('CHARACTER CONSISTENCY BIBLE');
      expect(prompt).toContain('Milo');
      expect(prompt).toContain('Luna');
    });
  });

  describe('FatigueDetector', () => {
    it('should return recommended formats and analyze recent trends', async () => {
      const fatigue = await fatigueDetector.checkFatigue(5);
      expect(fatigue).toBeDefined();
      expect(Array.isArray(fatigue.fatiguedCharacters)).toBe(true);
      expect(Array.isArray(fatigue.fatiguedFormats)).toBe(true);
      expect(Array.isArray(fatigue.recommendedFormats)).toBe(true);
      expect(fatigue.recommendedFormats.length).toBeGreaterThan(0);
    });
  });

  describe('CartoonScriptGenerator (30-45s Pacing & Storyboard Structure)', () => {
    it('should generate a 6-8 scene storyboard with dialogue, camera angles, emotions, and sfx cues', async () => {
      const idea: ScoredStoryIdea = {
        title: "Luna's Mysterious Moving Box",
        concept: "Luna inspects a cardboard box that moves on its own across the living room carpet.",
        format: 'WAIT_TILL_END',
        genre: 'SUSPENSE_TWIST',
        audience: 'FAMILY',
        suggestedCharacters: ['Luna', 'Milo'],
        hookSceneDescription: "A brown cardboard box suddenly turns around and tiptoes past the camera.",
        twistOrPayoff: "Pip the sparrow is underneath joyfully riding a toy electric truck.",
        scores: {
          hookPower: 8.5,
          curiosityDrive: 9.0,
          emotionalArc: 8.0,
          visualPotential: 8.5,
          humorSurprise: 8.5,
          originalityScore: 9.5,
          endingSatisfaction: 8.5,
          replayabilityScore: 8.5,
          finalScore: 86.0,
          rationale: 'High curiosity with surprise payoff',
        },
      };

      const script = await cartoonScriptGenerator.generateCartoonScript(idea, 'test-job');
      expect(script).toBeDefined();
      expect(script.scenes.length).toBeGreaterThanOrEqual(6);
      expect(script.scenes.length).toBeLessThanOrEqual(8);

      // Verify pacing falls strictly between 30 and 45 seconds
      const totalDuration = script.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
      expect(totalDuration).toBeGreaterThanOrEqual(30);
      expect(totalDuration).toBeLessThanOrEqual(45);

      // Verify scene details
      script.scenes.forEach((sc, idx) => {
        expect(sc.sceneNumber).toBe(idx + 1);
        expect(sc.visualPrompt).toBeDefined();
        expect(sc.cameraAngle).toBeDefined();
        expect(sc.emotion).toBeDefined();
        expect(sc.durationSeconds).toBeGreaterThan(0);
      });

      // Verify hook (Scene 1) is fast (2-4 seconds)
      expect(script.scenes[0].durationSeconds).toBeLessThanOrEqual(4);

      // Verify loop transition is present
      expect(script.loopTransition).toBeDefined();
    });
  });

  describe('CartoonVisualService (9:16 Scene Generation)', () => {
    it('should generate 1080x1920 PNG buffers for all scenes', async () => {
      const mockScenes = [
        {
          sceneNumber: 1,
          title: 'Kitchen Entrance',
          visualPrompt: 'Milo staring wide eyed at the ceiling',
          characterName: 'Milo',
          dialogue: 'Look at that huge flip!',
          action: 'Pointing at the ceiling excitedly',
          emotion: 'excited',
          cameraAngle: 'CLOSE_UP' as const,
          sfxCue: 'whoosh',
          durationSeconds: 3,
        },
        {
          sceneNumber: 2,
          title: 'The Table',
          visualPrompt: 'Luna holding a plate with a knowing grin',
          characterName: 'Luna',
          dialogue: 'I told you gravity always wins!',
          action: 'Catches pancake smoothly on plate',
          emotion: 'triumphant',
          cameraAngle: 'WIDE' as const,
          sfxCue: 'applause',
          durationSeconds: 5,
        },
      ];

      const results = await cartoonVisualService.generateCartoonScenes(mockScenes, "Milo's Pancake Flip");
      expect(results.length).toBe(2);
      expect(results[0].sceneIndex).toBe(1);
      expect(results[0].imageBuffer).toBeInstanceOf(Buffer);
      expect(results[0].imageBuffer.length).toBeGreaterThan(5000); // Valid PNG data
    });
  });

  describe('CartoonQualityGate', () => {
    it('should reject scripts with duration below 30 seconds', async () => {
      const script = {
        title: 'Too Short',
        logline: 'Too short animation',
        format: 'COMEDY' as any,
        genre: 'COMEDY' as any,
        targetDurationSeconds: 15,
        characters: [],
        scenes: [],
        loopTransition: '',
        totalEstimatedDuration: 15,
        wordCount: 10,
        tags: [],
        description: '',
      };

      const result = await cartoonQualityGate.validateCartoonShort('/path/does/not/exist.mp4', script, 'test-gate');
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
