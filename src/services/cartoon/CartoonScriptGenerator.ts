import { GoogleGenerativeAI } from '@google/generative-ai';
import { characterManager } from './CharacterManager.js';
import { settingRepository } from '../../repositories/SettingRepository.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import {
  CartoonScript,
  CharacterProfile,
  ScoredStoryIdea,
  StoryboardSceneItem,
} from '../../types/index.js';

export class CartoonScriptGenerator {
  /**
   * Generates a 6-8 scene storyboard and dialogue script timed strictly to 30-45 seconds (default target: 38s).
   */
  async generateCartoonScript(story: ScoredStoryIdea, jobId?: string): Promise<CartoonScript> {
    logger.job(jobId || 'cartoon', `Generating animated script & storyboard for: "${story.title}"`);

    // Fetch character bibles for the involved characters
    const charProfiles = await characterManager.getCharactersByNames(story.suggestedCharacters);
    const consistencyPrompt = await characterManager.buildCharacterConsistencyPrompt(story.suggestedCharacters);

    // Try generating with LLM
    try {
      const apiKey = (await settingRepository.getSecure('llm_api_key')) || config.llm.apiKey;
      if (apiKey) {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: config.llm.model || 'gemini-3.5-flash-lite' });

        const prompt = `You are a master animated shorts screenwriter for viral 3D cartoon YouTube Shorts.
STORY CONCEPT:
Title: ${story.title}
Premise: ${story.concept}
Format: ${story.format}
Genre: ${story.genre}
Hook: ${story.hookSceneDescription}
Twist/Payoff: ${story.twistOrPayoff}
Moral: ${story.moralLesson || 'Fun together'}

${consistencyPrompt}

TARGET DURATION: Exactly 38 seconds (Must be between 30 and 45 seconds).
Structure into 6 to 8 rapid, highly expressive scenes:
1. Scene 1 (0-2s, 2s duration): High-energy visual/verbal hook. Immediate curiosity.
2. Scene 2 (2-7s, 5s duration): Setup & goal.
3. Scene 3 (7-13s, 6s duration): Escalation / funny complication.
4. Scene 4 (13-20s, 7s duration): Stakes rise / absurd attempt.
5. Scene 5 (20-27s, 7s duration): The surprising twist / climax.
6. Scene 6 (27-33s, 6s duration): Payoff & hilarious/warm reaction.
7. Scene 7 (33-38s, 5s duration): Resolution and seamless loop transition back to Scene 1.

STRICT INSTRUCTIONS:
- Dialogue per scene must be short (maximum 8-12 words per line) so delivery is energetic and natural.
- Camera angle must be dynamic: CLOSE_UP, WIDE, ZOOM_IN, DUTCH_ANGLE, OVER_SHOULDER.
- SFX cues must be punchy: "pop", "whoosh", "boing", "sizzle", "gasp", "applause", "record_scratch".
- Visual prompts MUST explicitly describe the character's clothing and appearance from the bible.

Return ONLY a valid JSON object matching:
{
  "title": "${story.title}",
  "logline": "${story.concept}",
  "targetDurationSeconds": 38,
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Kitchen - Stove",
      "visualPrompt": "3D cartoon animation, Pixar style. Milo the puppy wearing navy-blue hoodie looks wide-eyed at a flying pancake.",
      "characterName": "Milo",
      "dialogue": "Watch this flip! It's gonna be legendary!",
      "action": "Jumping with frying pan outstretched",
      "emotion": "excited",
      "cameraAngle": "CLOSE_UP",
      "sfxCue": "whoosh",
      "bgmState": "UPBEAT",
      "durationSeconds": 3
    }
  ],
  "moralLesson": "${story.moralLesson || ''}",
  "loopTransition": "Final smile matches the opening energy for infinite replayability",
  "tags": ["cartoon", "animation", "funny", "shorts", "cute"],
  "description": "Watch what happens when..."
}`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length >= 5) {
            return this.normalizeAndValidateScript(parsed, story, charProfiles);
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[CartoonScriptGenerator] LLM generation error, falling back to curated template: ${err.message}`);
    }

    return this.buildFallbackScript(story, charProfiles);
  }

  private normalizeAndValidateScript(
    raw: any,
    story: ScoredStoryIdea,
    charProfiles: any[]
  ): CartoonScript {
    let scenes: StoryboardSceneItem[] = (raw.scenes || []).map((s: any, idx: number) => ({
      sceneNumber: idx + 1,
      title: s.title || `Scene ${idx + 1}`,
      visualPrompt: s.visualPrompt || `${story.concept} - 3D cute cartoon animation`,
      characterName: s.characterName || (charProfiles[0]?.name || 'Milo'),
      dialogue: s.dialogue || '',
      action: s.action || 'Expressive cartoon movement',
      emotion: s.emotion || 'happy',
      cameraAngle: s.cameraAngle || 'CLOSE_UP',
      sfxCue: s.sfxCue || 'pop',
      bgmState: s.bgmState || 'UPBEAT',
      durationSeconds: Number(s.durationSeconds) || 5,
    }));

    // Adjust scene durations to hit target of ~38 seconds
    const totalDuration = scenes.reduce((sum, sc) => sum + sc.durationSeconds, 0);
    const target = config.cartoon.targetDurationSeconds || 38;

    if (totalDuration < 30 || totalDuration > 45) {
      const scale = target / Math.max(totalDuration, 1);
      scenes = scenes.map((sc) => ({
        ...sc,
        durationSeconds: Math.max(2, Math.round(sc.durationSeconds * scale)),
      }));
    }

    const calculatedTotal = scenes.reduce((sum, sc) => sum + sc.durationSeconds, 0);
    const wordCount = scenes.reduce((sum, sc) => sum + sc.dialogue.split(/\s+/).filter(Boolean).length, 0);

    const convertedProfiles: CharacterProfile[] = charProfiles.map((c) => ({
      id: c.id,
      name: c.name,
      species: c.species,
      personality: Array.isArray(c.personality) ? c.personality.join(', ') : c.personality,
      visualStyle: '3D Pixar-style cartoon',
      signatureItem: c.clothing?.accessory || c.clothing?.outfit || '',
      colorPalette: 'vibrant warm tones',
      voicePersona: c.voiceProfile?.voiceName || 'en-US-AnaNeural',
    }));

    return {
      title: raw.title || story.title,
      logline: raw.logline || story.concept,
      format: story.format,
      genre: story.genre,
      targetDurationSeconds: calculatedTotal,
      characters: convertedProfiles,
      scenes,
      moralLesson: raw.moralLesson || story.moralLesson,
      loopTransition: raw.loopTransition || 'Smooth visual loop to start',
      totalEstimatedDuration: calculatedTotal,
      wordCount,
      tags: raw.tags || ['#cartoon', '#animation', '#shorts', '#funnyanimals', '#storytime'],
      description: `${story.concept}\n\nSubscribe for daily funny & heartwarming animated shorts! ✨ #shorts #animation`,
    };
  }

  private buildFallbackScript(story: ScoredStoryIdea, charProfiles: any[]): CartoonScript {
    const c1 = charProfiles[0]?.name || 'Milo';
    const c2 = charProfiles[1]?.name || 'Luna';

    const scenes: StoryboardSceneItem[] = [
      {
        sceneNumber: 1,
        title: 'The Challenge Begins',
        visualPrompt: `3D cartoon animation, Pixar style. ${c1} looking directly at the camera with wide eager eyes and big smile.`,
        characterName: c1,
        dialogue: `Wait till you see what happens next!`,
        action: `Bounces excitedly and points toward the kitchen counter`,
        emotion: 'excited',
        cameraAngle: 'CLOSE_UP',
        sfxCue: 'whoosh',
        bgmState: 'UPBEAT',
        durationSeconds: 3,
      },
      {
        sceneNumber: 2,
        title: 'The Setup',
        visualPrompt: `3D cartoon animation, warm cozy kitchen. ${c1} holds up a huge spatula with determination.`,
        characterName: c1,
        dialogue: `Today, I am creating the ultimate breakfast masterpiece!`,
        action: `Strikes a dramatic superhero chef pose`,
        emotion: 'confident',
        cameraAngle: 'WIDE',
        sfxCue: 'ding',
        bgmState: 'UPBEAT',
        durationSeconds: 5,
      },
      {
        sceneNumber: 3,
        title: 'The Skeptic Watches',
        visualPrompt: `3D cartoon animation. ${c2} sitting perched calmly on a stool with arms crossed and raised eyebrow.`,
        characterName: c2,
        dialogue: `Are you sure you know how gravity works?`,
        action: `Giggles softly and tilts head`,
        emotion: 'mischievous',
        cameraAngle: 'OVER_SHOULDER',
        sfxCue: 'snicker',
        bgmState: 'UPBEAT',
        durationSeconds: 5,
      },
      {
        sceneNumber: 4,
        title: 'The Epic Flip',
        visualPrompt: `3D cartoon animation. ${c1} flings the pan upward with extreme exaggerated cartoon effort.`,
        characterName: c1,
        dialogue: `Behold! The triple cosmic pancake flip!`,
        action: `Flips spatula, pancake zooms up toward the ceiling out of frame`,
        emotion: 'intense',
        cameraAngle: 'ZOOM_IN',
        sfxCue: 'boing',
        bgmState: 'SUSPENSE',
        durationSeconds: 6,
      },
      {
        sceneNumber: 5,
        title: 'The Disappearance',
        visualPrompt: `3D cartoon animation. Both characters look up at the ceiling in complete confusion.`,
        characterName: c2,
        dialogue: `Wait... where did it go? Did it enter orbit?`,
        action: `Looking left and right, blinking in disbelief`,
        emotion: 'shocked',
        cameraAngle: 'DUTCH_ANGLE',
        sfxCue: 'record_scratch',
        bgmState: 'SUSPENSE',
        durationSeconds: 6,
      },
      {
        sceneNumber: 6,
        title: 'The Unexpected Payoff',
        visualPrompt: `3D cartoon animation. ${c2} calmly pulls out a clean porcelain plate and holds it above her head.`,
        characterName: c2,
        dialogue: `Three, two, one... perfect catch!`,
        action: `Golden pancake lands with a soft golden gleam right onto the plate`,
        emotion: 'triumphant',
        cameraAngle: 'CLOSE_UP',
        sfxCue: 'applause',
        bgmState: 'TRIUMPHANT',
        durationSeconds: 7,
      },
      {
        sceneNumber: 7,
        title: 'Loop & Friendship',
        visualPrompt: `3D cartoon animation. Both characters smile warmly, sharing a warm slice together.`,
        characterName: c1,
        dialogue: `Ready for round two? Watch this!`,
        action: `Winks at the camera, looping seamlessly into scene 1`,
        emotion: 'happy',
        cameraAngle: 'WIDE',
        sfxCue: 'sparkle',
        bgmState: 'WARM',
        durationSeconds: 6,
      },
    ];

    const totalDuration = scenes.reduce((sum, sc) => sum + sc.durationSeconds, 0);
    const wordCount = scenes.reduce((sum, sc) => sum + sc.dialogue.split(/\s+/).filter(Boolean).length, 0);

    const convertedProfiles: CharacterProfile[] = charProfiles.map((c) => ({
      id: c.id,
      name: c.name,
      species: c.species,
      personality: Array.isArray(c.personality) ? c.personality.join(', ') : c.personality,
      visualStyle: '3D Pixar-style cartoon',
      signatureItem: c.clothing?.accessory || c.clothing?.outfit || '',
      colorPalette: 'vibrant warm tones',
      voicePersona: c.voiceProfile?.voiceName || 'en-US-AnaNeural',
    }));

    return {
      title: story.title,
      logline: story.concept,
      format: story.format,
      genre: story.genre,
      targetDurationSeconds: totalDuration,
      characters: convertedProfiles,
      scenes,
      moralLesson: story.moralLesson,
      loopTransition: 'Wink and gesture loops seamlessly back to the start',
      totalEstimatedDuration: totalDuration,
      wordCount,
      tags: ['#cartoon', '#animation', '#shorts', '#funny', '#viral'],
      description: `${story.concept}\n\nDaily original cartoon shorts! Subscribe for more adventures! 🐾`,
    };
  }
}

export const cartoonScriptGenerator = new CartoonScriptGenerator();
