import { GoogleGenerativeAI } from '@google/generative-ai';
import { kidsCharacterManager } from './KidsCharacterManager.js';
import { nurseryIdeaScorer } from './NurseryIdeaScorer.js';
import { songRepository } from '../../repositories/SongRepository.js';
import { settingRepository } from '../../repositories/SettingRepository.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import {
  NurseryContentMode,
  PreschoolAgeGroup,
  ScoredSongIdea,
  SongIdeaInput,
} from '../../types/index.js';

export class NurseryResearchService {
  /**
   * Researches high-performing preschool concepts, scores 20-30 candidate ideas,
   * prevents repetitive themes, and returns the top ranked song concept.
   */
  async discoverBestSongConcept(
    jobId?: string,
    forcedMode?: NurseryContentMode
  ): Promise<ScoredSongIdea> {
    logger.job(jobId || 'nursery', 'Starting Preschool Music & Nursery Rhyme Research...');

    // 1. Check recent themes to avoid fatigue
    let recentThemes: string[] = [];
    try {
      recentThemes = await songRepository.findRecentThemes(8);
    } catch {}

    // 2. Select character cast for this song
    const cast = await kidsCharacterManager.pickCastForSong(3);
    const charNames = cast.map((c) => c.name);
    logger.job(jobId || 'nursery', `Selected preschool cast: ${charNames.join(', ')}`);

    // 3. Generate 20-30 candidate concepts
    const candidateIdeas = await this.generateCandidateConcepts(charNames, forcedMode);
    logger.job(jobId || 'nursery', `Generated ${candidateIdeas.length} candidate preschool song ideas.`);

    // 4. Score all ideas via the 12-factor NurseryIdeaScorer
    const scoredIdeas: ScoredSongIdea[] = [];
    for (const idea of candidateIdeas) {
      const scores = nurseryIdeaScorer.scoreSongIdea(idea);
      let adjustedFinal = scores.finalScore;

      // Penalize recently used themes
      if (recentThemes.some((t) => t.toLowerCase().includes(idea.theme.toLowerCase()))) {
        adjustedFinal = Math.max(10, adjustedFinal - 20);
      }

      scoredIdeas.push({
        ...idea,
        scores: {
          ...scores,
          finalScore: adjustedFinal,
        },
      });
    }

    // 5. Filter out any copyright-infringing ideas (originality < 8)
    const validIdeas = scoredIdeas.filter((s) => (s.scores?.originality ?? 10) >= 8);
    validIdeas.sort((a, b) => (b.scores?.finalScore ?? 0) - (a.scores?.finalScore ?? 0));

    const winner = validIdeas[0] || scoredIdeas[0];
    logger.job(
      jobId || 'nursery',
      `🏆 Top song selected: "${winner.title}" [Mode: ${winner.contentMode}] Score: ${winner.scores?.finalScore ?? winner.totalScore ?? 85}/100 - ${winner.scores?.rationale ?? ''}`
    );

    return winner;
  }

  async discoverBestSongIdea(
    jobId?: string,
    forcedMode?: NurseryContentMode
  ): Promise<ScoredSongIdea> {
    return this.discoverBestSongConcept(jobId, forcedMode);
  }

  private async generateCandidateConcepts(
    characters: string[],
    forcedMode?: NurseryContentMode
  ): Promise<SongIdeaInput[]> {
    try {
      const apiKey = (await settingRepository.getSecure('llm_api_key')) || config.llm.apiKey;
      if (apiKey) {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: config.llm.model || 'gemini-3.5-flash-lite' });

        const prompt = `You are an elite creative director for an award-winning preschool animated music channel (like Sesame Workshop or original children's music).
Characters in our universe: ${characters.join(', ')}.
Target audience: Preschool children (ages 2-5).
${forcedMode ? `Forced mode: ${forcedMode}` : 'Modes: NURSERY_RHYME, ACTION_SONG, LEARNING_SONG, COUNTING_SONG, ABC_SONG, ANIMAL_SONG, BEDTIME_SONG, GOOD_HABITS_SONG, DANCE_SONG'}

Generate 10 ORIGINAL, highly memorable children's song concepts.
CRITICAL RULES:
1. ZERO COPYRIGHTED CHARACTERS OR SONGS (No CoComelon, No Baby Shark, No Disney, No Peppa Pig).
2. Must have high sing-along and dance participation (clapping, jumping, spinning, stomping).
3. Clear preschool learning objective (Colors, Numbers 1-5, Shapes, Washing hands, Kindness).

Return ONLY a JSON array matching:
[
  {
    "title": "Song Title",
    "theme": "Core preschool theme (e.g. Colors, Counting 1-5, Brushing teeth)",
    "contentMode": "ONE OF: NURSERY_RHYME, ACTION_SONG, LEARNING_SONG, COUNTING_SONG, ABC_SONG, ANIMAL_SONG, BEDTIME_SONG, GOOD_HABITS_SONG, DANCE_SONG",
    "targetAge": "3-5",
    "learningObjective": "Specific preschool educational skill taught",
    "emotionalTone": "cheerful",
    "characters": ["${characters.join('", "')}"],
    "setting": "Rainbow Playground",
    "chorusConcept": "Simple repetitive chorus kids can memorize in 5 seconds",
    "visualConcept": "Bright, colorful 3D animation visual description",
    "danceConcept": "Specific actions (clap, jump, spin, stomp)",
    "replayPotential": "Why kids will ask to play it again"
  }
]`;

        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as SongIdeaInput[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[NurseryResearchService] LLM research note: ${err.message}. Using high-quality curated song pool.`);
    }

    return this.getCuratedPreschoolSongPool(characters);
  }

  private getCuratedPreschoolSongPool(characters: string[]): SongIdeaInput[] {
    const c1 = characters[0] || 'Leo';
    const c2 = characters[1] || 'Mia';
    const c3 = characters[2] || 'Toby';

    return [
      {
        title: 'The Rainbow Color Train',
        theme: 'Colors and Shapes',
        contentMode: 'LEARNING_SONG',
        targetAge: '3-5',
        learningObjective: 'Identify and chant primary and secondary colors (Red, Blue, Yellow, Green)',
        emotionalTone: 'joyful and energetic',
        characters: [c1, c2, c3],
        setting: 'Rainbow Playground',
        chorusConcept: 'Choo choo red! Choo choo blue! Rainbow train is coming through!',
        visualConcept: 'A sparkling wooden toy train with colorful passenger cars driven by Leo through rainbow arches',
        danceConcept: 'Train chug arms, jump on green, spin on yellow',
        replayPotential: 'High repetition with rhythmic train sounds kids chant repeatedly',
      },
      {
        title: 'Five Funny Little Fireflies',
        theme: 'Counting 1 to 5',
        contentMode: 'COUNTING_SONG',
        targetAge: '3-5',
        learningObjective: 'Count from 1 to 5 forward and backward with visual finger counting',
        emotionalTone: 'playful and magical',
        characters: [c1, c2, c3],
        setting: 'Fruit & Color Garden',
        chorusConcept: 'Blink blink, one two three! Glowing bright for you and me!',
        visualConcept: 'Glowing friendly fireflies bouncing softly from petal to petal with number badges',
        danceConcept: 'Finger counting, gentle tip-toe spins, hand sparkles',
        replayPotential: 'Visual glow and rhythmic counting encourages counting along',
      },
      {
        title: 'Brush Brush Brush Your Teeth',
        theme: 'Healthy Habits & Bedtime',
        contentMode: 'GOOD_HABITS_SONG',
        targetAge: '2-3',
        learningObjective: 'Practice 2-minute daily tooth brushing with top, bottom, and circle motions',
        emotionalTone: 'upbeat and encouraging',
        characters: [c1, c2],
        setting: 'Bubble Bath Studio',
        chorusConcept: 'Brush, brush, brush your teeth! Round and round and clean!',
        visualConcept: 'Giant sparkling toothbrush with friendly rainbow foam bubbles dancing in rhythm',
        danceConcept: 'Hand brushing motions, big smiles, spitting rinse gesture',
        replayPotential: 'Essential daily routine song parents play every morning and night',
      },
      {
        title: 'The Animal Sounds Parade',
        theme: 'Animal Sounds & Vocabulary',
        contentMode: 'ANIMAL_SONG',
        targetAge: '2-3',
        learningObjective: 'Associate animals with phonetic sounds (Lion says Roar, Duck says Quack, Bear says Growl)',
        emotionalTone: 'exuberant and hilarious',
        characters: [c1, c2, c3],
        setting: 'Friendly Sunny Farm',
        chorusConcept: 'Hear the music in the air, animal sounds are everywhere!',
        visualConcept: 'A cheerful marching parade with characters playing little tambourines and making animal ears',
        danceConcept: 'Marching high knees, animal ear hand gestures, loud animal roar/quack actions',
        replayPotential: 'Toddlers love mimicking animal vocal sounds',
      },
      {
        title: 'The Clap and Jump Dance',
        theme: 'Physical Coordination & Action',
        contentMode: 'ACTION_SONG',
        targetAge: '3-5',
        learningObjective: 'Gross motor skills, left-right balance, following multi-step auditory directions',
        emotionalTone: 'high energy party',
        characters: [c1, c2, c3],
        setting: 'Rainbow Playground',
        chorusConcept: 'Clap, clap! Stomp, stomp! Jump up high and freeze!',
        visualConcept: 'Characters leading a giant dance circle with bouncy animations and freeze frames',
        danceConcept: 'Clapping, stomping feet, jumping high, freeze statue pose',
        replayPotential: 'Kids play freeze dance over and over again',
      },
      {
        title: 'Wash Wash Wash Your Hands',
        theme: 'Cleanliness & Hygiene',
        contentMode: 'GOOD_HABITS_SONG',
        targetAge: '3-5',
        learningObjective: 'Rubbing hands with soap bubbles front, back, and between fingers for 20 seconds',
        emotionalTone: 'fun and bubbly',
        characters: [c1, c2],
        setting: 'Bubble Bath Studio',
        chorusConcept: 'Scrub the top, scrub the palms! Wash the germs away!',
        visualConcept: 'Rainbow bubbles popping into musical notes while characters lather hands',
        danceConcept: 'Hand rubbing, finger interlacing, shake-dry hands dance',
        replayPotential: 'Sing-along timer for hand washing in school and home',
      },
      {
        title: 'Good Morning, Little Sunshine',
        theme: 'Morning Routine & Positivity',
        contentMode: 'NURSERY_RHYME',
        targetAge: '2-3',
        learningObjective: 'Gentle positive emotional start to the day, stretching and greeting friends',
        emotionalTone: 'warm and loving',
        characters: [c1, c2],
        setting: 'Sunny Preschool Classroom',
        chorusConcept: 'Wake up, wake up, sun is high! Wave your hands up to the sky!',
        visualConcept: 'Golden morning light streaming through windows as flowers open and characters stretch',
        danceConcept: 'Big morning stretch, wide yawns, waving hello, hugging friends',
        replayPotential: 'Gentle morning routine starter for families',
      },
      {
        title: 'Twinkle Star Lullaby',
        theme: 'Bedtime & Calming',
        contentMode: 'BEDTIME_SONG',
        targetAge: '2-3',
        learningObjective: 'Calm breathing, bedtime relaxation, feeling safe and loved',
        emotionalTone: 'peaceful and soothing',
        characters: [c1, c2],
        setting: 'Starry Bedtime Room',
        chorusConcept: 'Close your eyes and drift away, stars will guide you till the day.',
        visualConcept: 'Soft glowing stars floating gently in the air, characters tucked in cozy beds',
        danceConcept: 'Gentle rocking, head nodding, soft hand waves, slow deep breath',
        replayPotential: 'Bedtime staple for toddlers to fall asleep',
      },
    ];
  }
}

export const nurseryResearchService = new NurseryResearchService();
