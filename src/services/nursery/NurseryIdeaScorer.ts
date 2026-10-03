import { SongIdeaInput, SongScoreBreakdown } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class NurseryIdeaScorer {
  /**
   * Scores preschool song concepts across 12 child-development and musical retention factors
   * with strict originality enforcement.
   */
  scoreSong(idea: SongIdeaInput): SongScoreBreakdown {
    return this.scoreSongIdea(idea);
  }

  scoreSongIdea(idea: SongIdeaInput): SongScoreBreakdown {
    // 1. Educational Value (0-10)
    let educationalValue = 7.0;
    if (idea.learningObjective && idea.learningObjective.length > 5) {
      educationalValue += 2.0;
    }
    if (idea.contentMode && ['LEARNING_SONG', 'COUNTING_SONG', 'ABC_SONG', 'GOOD_HABITS_SONG'].includes(idea.contentMode as string)) {
      educationalValue += 1.0;
    }
    educationalValue = Math.min(10, Math.max(1, educationalValue));

    // 2. Sing-Along Potential (0-10)
    let singAlongPotential = 7.5;
    if (idea.chorusConcept && (idea.chorusConcept.includes('repeat') || idea.chorusConcept.includes('simple'))) {
      singAlongPotential += 2.0;
    }
    singAlongPotential = Math.min(10, Math.max(1, singAlongPotential));

    // 3. Memorability (0-10)
    let memorability = 7.5;
    if (idea.theme.length < 30) memorability += 1.5;
    memorability = Math.min(10, Math.max(1, memorability));

    // 4. Repetition Potential (0-10)
    let repetitionPotential = 8.0;
    if (idea.contentMode === 'COUNTING_SONG' || idea.contentMode === 'ACTION_SONG' || idea.contentMode === 'NURSERY_RHYME') {
      repetitionPotential += 1.5;
    }
    repetitionPotential = Math.min(10, Math.max(1, repetitionPotential));

    // 5. Visual Potential (0-10)
    let visualPotential = 8.0;
    if (idea.visualConcept && idea.visualConcept.length > 10) visualPotential += 1.5;
    visualPotential = Math.min(10, Math.max(1, visualPotential));

    // 6. Character Appeal (0-10)
    let characterAppeal = 8.0;
    if (idea.characters && idea.characters.length >= 2) characterAppeal += 1.5;
    characterAppeal = Math.min(10, Math.max(1, characterAppeal));

    // 7. Dance Potential (0-10)
    let dancePotential = 7.0;
    if (idea.contentMode === 'DANCE_SONG' || idea.contentMode === 'ACTION_SONG' || idea.category === 'ACTION_SONG' || (idea.actionMoves && idea.actionMoves.length > 0)) {
      dancePotential += 2.5;
    } else if (idea.danceConcept && idea.danceConcept.length > 5) {
      dancePotential += 1.5;
    }
    dancePotential = Math.min(10, Math.max(1, dancePotential));

    // 8. Parent Usefulness (0-10)
    let parentUsefulness = 7.0;
    if (idea.contentMode === 'GOOD_HABITS_SONG' || idea.contentMode === 'BEDTIME_SONG' || idea.contentMode === 'LEARNING_SONG') {
      parentUsefulness += 2.5;
    }
    parentUsefulness = Math.min(10, Math.max(1, parentUsefulness));

    // 9. Child Participation (0-10)
    let childParticipation = 7.5;
    if (idea.danceConcept && (idea.danceConcept.includes('jump') || idea.danceConcept.includes('clap') || idea.danceConcept.includes('call'))) {
      childParticipation += 2.0;
    }
    childParticipation = Math.min(10, Math.max(1, childParticipation));

    // 10. Originality (0-10) - Strict IP Protection Gate
    let originality = 9.5;
    const ipKeywords = [
      'cocomelon',
      'peppa pig',
      'baby shark',
      'pinkfong',
      'disney',
      'mickey',
      'paw patrol',
      'bluey',
      'dora',
      'thomas',
      'sesame',
      'blippi',
      'chuchu',
    ];
    const fullText = `${idea.title} ${idea.theme} ${idea.chorusConcept || ''} ${idea.visualConcept || ''}`.toLowerCase();
    for (const kw of ipKeywords) {
      if (fullText.includes(kw)) {
        originality = 1.0;
        logger.warn(`[NurseryIdeaScorer] Detected IP keyword '${kw}', severe originality penalty.`);
        break;
      }
    }

    // 11. Trend Relevance (0-10)
    let trendRelevance = 8.0;
    if (idea.contentMode && ['NURSERY_RHYME', 'COUNTING_SONG', 'GOOD_HABITS_SONG', 'ACTION_SONG'].includes(idea.contentMode as string)) {
      trendRelevance += 1.5;
    }
    trendRelevance = Math.min(10, Math.max(1, trendRelevance));

    // 12. Replay Potential (0-10)
    let replayPotential = 8.5;
    if (idea.targetAge === '3-5' || idea.targetAge === '2-3') replayPotential += 1.0;
    replayPotential = Math.min(10, Math.max(1, replayPotential));

    // Hard gate: If originality < 8, cap total at 15
    let finalScore: number;
    if (originality < 8) {
      finalScore = 15;
    } else {
      // Weighted formula:
      // Sing-along & Memorability: 20%
      // Child Participation & Dance: 20%
      // Educational Value & Parent Usefulness: 20%
      // Repetition & Replay Potential: 15%
      // Visual & Character Appeal: 15%
      // Originality & Trend: 10%
      const singAlongGroup = (singAlongPotential + memorability) / 2; // 20%
      const activeGroup = (childParticipation + dancePotential) / 2;    // 20%
      const eduGroup = (educationalValue + parentUsefulness) / 2;       // 20%
      const repeatGroup = (repetitionPotential + replayPotential) / 2;  // 15%
      const visualGroup = (visualPotential + characterAppeal) / 2;      // 15%
      const trendGroup = (originality + trendRelevance) / 2;            // 10%

      finalScore = Number(
        (
          singAlongGroup * 2.0 +
          activeGroup * 2.0 +
          eduGroup * 2.0 +
          repeatGroup * 1.5 +
          visualGroup * 1.5 +
          trendGroup * 1.0
        ).toFixed(1)
      );
    }

    const rationale = originality < 8
      ? `Zero-Tolerance IP Rejection: Originality score ${originality.toFixed(1)}/10. Score capped at 15.`
      : `Total: ${finalScore}/100 | SingAlong: ${singAlongPotential.toFixed(1)}/10 | Edu: ${educationalValue.toFixed(1)}/10 | Dance: ${dancePotential.toFixed(1)}/10 | Participation: ${childParticipation.toFixed(1)}/10 | Originality: ${originality.toFixed(1)}/10`;

    return {
      educationalValue,
      singAlongPotential,
      memorability,
      repetitionPotential,
      visualPotential,
      characterAppeal,
      dancePotential,
      parentUsefulness,
      childParticipation,
      originality,
      trendRelevance,
      replayPotential,
      finalScore,
      rationale,
    };
  }
}

export const nurseryIdeaScorer = new NurseryIdeaScorer();
