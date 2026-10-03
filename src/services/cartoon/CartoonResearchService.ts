import { GoogleGenerativeAI } from '@google/generative-ai';
import { characterManager } from './CharacterManager.js';
import { storyScorer } from './StoryScorer.js';
import { fatigueDetector } from './FatigueDetector.js';
import { storyRepository } from '../../repositories/StoryRepository.js';
import { settingRepository } from '../../repositories/SettingRepository.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { ScoredStoryIdea, StoryFormat, StoryGenre, StoryIdeaInput } from '../../types/index.js';

export class CartoonResearchService {
  /**
   * Discovers and generates 10-20 original cartoon story concepts, scores them,
   * enforces fatigue penalties, and returns the top ranked story idea.
   */
  async discoverBestStory(jobId?: string): Promise<ScoredStoryIdea> {
    logger.job(jobId || 'cartoon', 'Starting Cartoon Story Research & Trend Analysis...');

    // 1. Check audience and character fatigue
    const fatigue = await fatigueDetector.checkFatigue();
    logger.job(
      jobId || 'cartoon',
      `Fatigue check: ${fatigue.fatiguedCharacters.length} fatigued characters, ${fatigue.fatiguedFormats.length} fatigued formats.`
    );

    // 2. Select character cast for this session
    const characters = await characterManager.pickCharactersForStory(2, fatigue.fatiguedCharacters);
    const charNames = characters.map((c) => c.name);
    logger.job(jobId || 'cartoon', `Selected character cast: ${charNames.join(' and ')}`);

    // 3. Generate candidate ideas (LLM or curated high-retention premise pool)
    const rawIdeas = await this.generateCandidateStoryIdeas(charNames, fatigue.recommendedFormats);
    logger.job(jobId || 'cartoon', `Generated ${rawIdeas.length} candidate story ideas.`);

    // 4. Score all ideas using the 8-factor StoryScorer
    const scoredIdeas: ScoredStoryIdea[] = [];
    for (const idea of rawIdeas) {
      const scores = storyScorer.scoreStory(idea);
      // Penalize format if slightly overused
      let adjustedFinal = scores.finalScore;
      if (fatigue.fatiguedFormats.includes(idea.format)) {
        adjustedFinal = Math.max(10, adjustedFinal - 15);
      }

      scoredIdeas.push({
        ...idea,
        scores: {
          ...scores,
          finalScore: adjustedFinal,
        },
      });
    }

    // 5. Filter out any ideas failing originality gate (originality < 7)
    const validIdeas = scoredIdeas.filter((s) => s.scores.originalityScore >= 7);
    validIdeas.sort((a, b) => b.scores.finalScore - a.scores.finalScore);

    const winner = validIdeas[0] || scoredIdeas[0];
    logger.job(
      jobId || 'cartoon',
      `Top story selected: "${winner.title}" [Format: ${winner.format}] Score: ${winner.scores.finalScore}/100 - ${winner.scores.rationale}`
    );

    // 6. Save top candidate ideas into database for future tracking and admin visibility
    for (const topIdea of validIdeas.slice(0, 5)) {
      try {
        await storyRepository.createStoryIdea({
          ...topIdea,
          scores: topIdea.scores,
          status: topIdea.title === winner.title ? 'APPROVED' : 'DRAFT',
        });
      } catch (err: any) {
        logger.warn(`[CartoonResearchService] Could not persist story idea "${topIdea.title}": ${err.message}`);
      }
    }

    return winner;
  }

  private async generateCandidateStoryIdeas(characterNames: string[], allowedFormats: string[]): Promise<StoryIdeaInput[]> {
    try {
      const apiKey = (await settingRepository.getSecure('llm_api_key')) || config.llm.apiKey;
      if (apiKey) {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: config.llm.model || 'gemini-3.5-flash-lite' });

        const prompt = `You are an elite creative director for viral 3D animated YouTube Shorts (30-45 seconds).
Characters available: ${characterNames.join(', ')}.
Allowed formats: ${allowedFormats.join(', ')}.

Create 8 ORIGINAL, hilarious or heartwarming cartoon short concepts designed for maximum audience retention (viewed vs swiped rate > 75%, completion rate > 90%).
STRICT RULES:
1. Zero copyrighted characters or worlds (NO Disney, Pixar, Marvel, Anime IP).
2. Must have a high-energy hook in the first 2 seconds.
3. Must feature a surprising, funny twist or emotional payoff at 32-40s.
4. Output valid JSON array with objects matching:
[
  {
    "title": "Short punchy title",
    "concept": "1-2 sentence core premise",
    "format": "ONE OF: FUNNY_MISUNDERSTANDING, UNEXPECTED_ENDING, EMOTIONAL_RESCUE, MINI_ADVENTURE, PROBLEM_SOLVER, CLEVER_UNDERDOG, WHOLESOME_FRIENDSHIP, WAIT_TILL_END",
    "genre": "ONE OF: COMEDY, ADVENTURE, HEARTWARMING, SUSPENSE_TWIST, MORAL",
    "audience": "FAMILY",
    "suggestedCharacters": ["${characterNames.join('", "')}"],
    "hookSceneDescription": "Visual hook in first 0-2 seconds that stops the scroll",
    "twistOrPayoff": "Surprising twist or satisfying resolution at 35 seconds",
    "moralLesson": "Optional light positive takeaway"
  }
]
Return ONLY JSON.`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as StoryIdeaInput[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[CartoonResearchService] LLM story idea generation fallback: ${err.message}`);
    }

    // High quality curated concept pool as guaranteed fallback
    return this.getFallbackConcepts(characterNames);
  }

  private getFallbackConcepts(characters: string[]): StoryIdeaInput[] {
    const p1 = characters[0] || 'Milo';
    const p2 = characters[1] || 'Luna';

    return [
      {
        title: `${p1}'s Impossible Pancake Flip`,
        concept: `${p1} attempts an epic chef-style pancake flip to impress ${p2}, but the pancake vanishes onto the ceiling.`,
        format: 'FUNNY_MISUNDERSTANDING',
        genre: 'COMEDY',
        audience: 'FAMILY',
        suggestedCharacters: [p1, p2],
        hookSceneDescription: `${p1} wearing a giant chef hat looks up in sheer panic as a golden pancake sizzles mid-air.`,
        twistOrPayoff: `${p2} quietly places a plate on her head right before the pancake drops perfectly into place.`,
        moralLesson: 'Teamwork makes the breakfast work.',
      },
      {
        title: `The Mystery of the Moving Box`,
        concept: `${p1} and ${p2} encounter a cardboard box in the living room that walks on its own.`,
        format: 'WAIT_TILL_END',
        genre: 'SUSPENSE_TWIST',
        audience: 'FAMILY',
        suggestedCharacters: [p1, p2],
        hookSceneDescription: `A normal brown cardboard box suddenly sprouts tiny paws and sneaks past the camera.`,
        twistOrPayoff: `The box tips over to reveal little Pip the sparrow happily driving a toy electric car underneath.`,
        moralLesson: 'Curiosity brings delightful surprises.',
      },
      {
        title: `${p1}'s Giant Bubble Trouble`,
        concept: `${p1} blows a soap bubble so enormous that it lifts a jar of treats into the sky.`,
        format: 'PROBLEM_SOLVER',
        genre: 'ADVENTURE',
        audience: 'FAMILY',
        suggestedCharacters: [p1, p2],
        hookSceneDescription: `A sparkling iridescent bubble the size of a beach ball gently floats upward with a cookie jar!`,
        twistOrPayoff: `${p2} uses a gentle puff of air from a tiny fan to guide the bubble right into their treehouse window.`,
        moralLesson: 'Smart thinking beats brute force.',
      },
      {
        title: `The Great Yarn Tangle Rescue`,
        concept: `${p2} accidentally tangles herself in rainbow yarn while hunting a fake mouse, and ${p1} devises a rescue.`,
        format: 'WHOLESOME_FRIENDSHIP',
        genre: 'HEARTWARMING',
        audience: 'FAMILY',
        suggestedCharacters: [p1, p2],
        hookSceneDescription: `${p2} is rolled up like a colorful rainbow yarn burrito, only her eyes blinking awkwardly.`,
        twistOrPayoff: `${p1} rolls the yarn ball into an intricate cozy knitted nest, turning the accident into the best nap spot.`,
        moralLesson: 'True friends turn embarrassments into comfort.',
      },
      {
        title: `The Unopenable Golden Cookie Tin`,
        concept: `${p1} exhausts every tool in the house trying to open an airtight metal tin.`,
        format: 'UNEXPECTED_ENDING',
        genre: 'COMEDY',
        audience: 'FAMILY',
        suggestedCharacters: [p1, p2],
        hookSceneDescription: `${p1} strains with bulging cartoon eyes trying to pry open a shiny round tin.`,
        twistOrPayoff: `${p2} simply pushes the lid release button on the side and hands over the treat with a grin.`,
        moralLesson: 'Always check the instructions first.',
      },
    ];
  }
}

export const cartoonResearchService = new CartoonResearchService();
