import { StoryIdeaInput, StoryScoreBreakdown } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class StoryScorer {
  /**
   * Scores a cartoon story idea based on viral retention dynamics and animated short heuristics.
   */
  scoreStory(idea: StoryIdeaInput): StoryScoreBreakdown {
    // 1. Hook Power (0-10)
    let hookPower = 6.5;
    const hookLower = (idea.hookSceneDescription || '').toLowerCase();
    if (
      hookLower.includes('suddenly') ||
      hookLower.includes('unexpected') ||
      hookLower.includes('trapped') ||
      hookLower.includes('secret') ||
      hookLower.includes('panic') ||
      hookLower.includes('chaos') ||
      hookLower.includes('danger')
    ) {
      hookPower += 2.0;
    }
    if (
      hookLower.includes('huge') ||
      hookLower.includes('giant') ||
      hookLower.includes('flying') ||
      hookLower.includes('mid-air') ||
      hookLower.includes('glowing') ||
      hookLower.includes('mystery') ||
      hookLower.includes('epic')
    ) {
      hookPower += 1.5;
    }
    hookPower = Math.min(10, Math.max(1, hookPower));


    // 2. Curiosity Drive (0-10)
    let curiosityDrive = 6.5;
    if (idea.format === 'WAIT_TILL_END' || idea.format === 'UNEXPECTED_ENDING') {
      curiosityDrive += 2.0;
    } else if (idea.format === 'FUNNY_MISUNDERSTANDING' || idea.format === 'PROBLEM_SOLVER') {
      curiosityDrive += 1.5;
    }
    curiosityDrive = Math.min(10, Math.max(1, curiosityDrive));

    // 3. Emotional Arc (0-10)
    let emotionalArc = 7.0;
    if (idea.genre === 'HEARTWARMING' || idea.genre === 'SUSPENSE_TWIST') {
      emotionalArc += 1.5;
    }
    if (idea.moralLesson && idea.moralLesson.length > 5) {
      emotionalArc += 1.0;
    }
    emotionalArc = Math.min(10, Math.max(1, emotionalArc));

    // 4. Visual Potential (0-10)
    let visualPotential = 7.5;
    const premiseLower = (idea.concept || '').toLowerCase();
    if (premiseLower.includes('fly') || premiseLower.includes('chase') || premiseLower.includes('drop') || premiseLower.includes('bounce') || premiseLower.includes('sparkle')) {
      visualPotential += 1.5;
    }
    visualPotential = Math.min(10, Math.max(1, visualPotential));

    // 5. Humor & Surprise (0-10)
    let humorSurprise = 6.5;
    if (idea.format === 'FUNNY_MISUNDERSTANDING' || idea.genre === 'COMEDY') {
      humorSurprise += 2.0;
    }
    if (idea.twistOrPayoff && idea.twistOrPayoff.length > 10) {
      humorSurprise += 1.0;
    }
    humorSurprise = Math.min(10, Math.max(1, humorSurprise));

    // 6. Originality Score (0-10)
    // Check for IP infringement words (Disney, Mickey, Pikachu, SpongeBob, Mario, Marvel, etc.)
    let originalityScore = 9.5;
    const ipKeywords = ['mickey', 'minnie', 'pikachu', 'pokemon', 'spongebob', 'mario', 'disney', 'pixar', 'marvel', 'batman', 'spider-man', 'elsa', 'frozen'];
    const fullText = `${idea.title} ${idea.concept} ${idea.hookSceneDescription} ${idea.twistOrPayoff}`.toLowerCase();
    for (const kw of ipKeywords) {
      if (fullText.includes(kw)) {
        originalityScore = 1.0; // Instant penalty for copyrighted IP references
        logger.warn(`[StoryScorer] Detected IP keyword '${kw}', severe originality penalty.`);
        break;
      }
    }

    // 7. Ending Satisfaction (0-10)
    let endingSatisfaction = 7.0;
    if (idea.twistOrPayoff && idea.twistOrPayoff.length > 15) {
      endingSatisfaction += 2.0;
    }
    endingSatisfaction = Math.min(10, Math.max(1, endingSatisfaction));

    // 8. Replayability (0-10)
    let replayabilityScore = 6.5;
    if (idea.format === 'WAIT_TILL_END' || idea.format === 'UNEXPECTED_ENDING' || idea.format === 'CLEVER_UNDERDOG') {
      replayabilityScore += 2.0;
    }
    replayabilityScore = Math.min(10, Math.max(1, replayabilityScore));

    // Strict rejection gate: If originality < 7, final score capped at 20
    let finalScore: number;
    if (originalityScore < 7) {
      finalScore = 15;
    } else {
      // Weighted formula (total out of 100):
      // Hook Power: 20%
      // Curiosity: 15%
      // Humor & Surprise: 15%
      // Ending Satisfaction: 15%
      // Visual Potential: 10%
      // Emotional Arc: 10%
      // Replayability: 10%
      // Originality: 5%
      finalScore = Number(
        (
          hookPower * 2.0 +
          curiosityDrive * 1.5 +
          humorSurprise * 1.5 +
          endingSatisfaction * 1.5 +
          visualPotential * 1.0 +
          emotionalArc * 1.0 +
          replayabilityScore * 1.0 +
          originalityScore * 0.5
        ).toFixed(1)
      );
    }

    const rationale = `Hook: ${hookPower.toFixed(1)}/10 | Curiosity: ${curiosityDrive.toFixed(1)}/10 | Humor: ${humorSurprise.toFixed(1)}/10 | Ending: ${endingSatisfaction.toFixed(1)}/10 | Visual: ${visualPotential.toFixed(1)}/10 | Replay: ${replayabilityScore.toFixed(1)}/10 | Originality: ${originalityScore.toFixed(1)}/10`;

    return {
      hookPower,
      curiosityDrive,
      emotionalArc,
      visualPotential,
      humorSurprise,
      originalityScore,
      endingSatisfaction,
      replayabilityScore,
      finalScore,
      rationale,
    };
  }
}

export const storyScorer = new StoryScorer();
