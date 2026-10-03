import { Character } from '@prisma/client';
import { characterRepository } from '../../repositories/CharacterRepository.js';
import { logger } from '../../utils/logger.js';

export interface SeedCharacter {
  name: string;
  species: string;
  ageGroup: string;
  personality: string[];
  appearance: Record<string, any>;
  clothing: Record<string, any>;
  voiceProfile: Record<string, any>;
  bible: string;
}

export const DEFAULT_CHARACTERS: SeedCharacter[] = [
  {
    name: 'Milo',
    species: 'Golden Puppy',
    ageGroup: 'young',
    personality: ['curious', 'energetic', 'optimistic', 'playful'],
    appearance: {
      fur: 'warm golden-brown fluffy coat',
      ears: 'large floppy puppy ears',
      eyes: 'expressive big amber eyes',
      build: 'small, bouncy puppy',
    },
    clothing: {
      outfit: 'navy-blue hooded sweatshirt',
      emblem: 'tiny yellow paw print on chest',
    },
    voiceProfile: {
      voiceName: 'en-US-AnaNeural',
      pitch: '+5Hz',
      speed: '1.05',
      tone: 'enthusiastic and youthful',
    },
    bible:
      'Milo is a small, expressive golden-brown puppy with oversized floppy ears, warm amber eyes, wearing a dark navy-blue hooded sweatshirt with a tiny yellow paw emblem on the chest. Fur color, ear shape, and navy hoodie must remain identical in every scene. 3D cute cartoon Pixar aesthetic.',
  },
  {
    name: 'Luna',
    species: 'Tuxedo Kitten',
    ageGroup: 'young',
    personality: ['clever', 'quick-witted', 'agile', 'secretly affectionate'],
    appearance: {
      fur: 'sleek black fur with white chest and paws',
      eyes: 'brilliant emerald green eyes',
      ears: 'pointed alert ears, right ear with tiny white tip',
      build: 'nimble and petite',
    },
    clothing: {
      outfit: 'scarlet red collar',
      accessory: 'round golden jingle bell',
    },
    voiceProfile: {
      voiceName: 'en-US-JennyNeural',
      pitch: '+2Hz',
      speed: '1.02',
      tone: 'clever, warm, and playful',
    },
    bible:
      'Luna is a sleek black and white tuxedo kitten with big emerald-green eyes and a red collar with a shiny golden bell. Her fur pattern, green eye color, and red collar are strictly constant in every scene. 3D cute cartoon Pixar aesthetic.',
  },
  {
    name: 'Barnaby',
    species: 'Brown Bear Cub',
    ageGroup: 'young',
    personality: ['gentle', 'clumsy', 'heart of gold', 'protective'],
    appearance: {
      fur: 'soft honey-brown thick fur',
      eyes: 'kind dark button eyes',
      ears: 'round fuzzy bear ears',
      build: 'chubby, cuddly bear cub',
    },
    clothing: {
      outfit: 'sunflower-yellow knitted wool scarf',
      accessory: 'scarf wrapped once with one end hanging down',
    },
    voiceProfile: {
      voiceName: 'en-US-GuyNeural',
      pitch: '-5Hz',
      speed: '0.95',
      tone: 'gentle, warm, and deliberate',
    },
    bible:
      'Barnaby is a chubby honey-brown bear cub with round fuzzy ears and a sunflower-yellow hand-knitted scarf wrapped around his neck. His gentle demeanor, honey-brown fur, and yellow scarf are locked in every scene. 3D cute cartoon Pixar aesthetic.',
  },
  {
    name: 'Pip',
    species: 'Blue Sparrow',
    ageGroup: 'young',
    personality: ['brave', 'fast-talking', 'adventurous', 'scout'],
    appearance: {
      feathers: 'cobalt blue feathers with creamy white chest',
      beak: 'small sunny-yellow triangular beak',
      build: 'palm-sized energetic songbird',
    },
    clothing: {
      accessory: 'miniature brass aviator goggles resting above forehead',
    },
    voiceProfile: {
      voiceName: 'en-US-AriaNeural',
      pitch: '+8Hz',
      speed: '1.10',
      tone: 'cheerful, rapid-fire, and brave',
    },
    bible:
      'Pip is an adorable tiny cobalt-blue sparrow with a white chest and tiny antique brass goggles perched on his head. His tiny size, blue plumage, and brass goggles must never change. 3D cute cartoon Pixar aesthetic.',
  },
];

export class CharacterManager {
  private initialized = false;

  async ensureSeeded(): Promise<void> {
    if (this.initialized) return;

    try {
      for (const charData of DEFAULT_CHARACTERS) {
        const existing = await characterRepository.findByName(charData.name);
        if (!existing) {
          await characterRepository.create(charData);
          logger.info(`[CharacterManager] Seeded initial character bible for: ${charData.name}`);
        }
      }
      this.initialized = true;
    } catch (err: any) {
      logger.error('[CharacterManager] Failed to seed default characters', { error: err.message });
    }
  }

  private toMockCharacter(seed: SeedCharacter): Character {
    return {
      id: `mock-${seed.name.toLowerCase()}`,
      name: seed.name,
      species: seed.species,
      ageGroup: seed.ageGroup,
      personality: seed.personality,
      appearance: seed.appearance,
      clothing: seed.clothing,
      voiceProfile: seed.voiceProfile,
      referenceImage: null,
      bible: seed.bible,
      appearanceCount: 0,
      avgRetention: 85.0,
      avgViews: 1200,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getAllCharacters(): Promise<Character[]> {
    try {
      await this.ensureSeeded();
      const list = await characterRepository.findAll();
      if (list && list.length > 0) return list;
    } catch {}
    return DEFAULT_CHARACTERS.map((s) => this.toMockCharacter(s));
  }

  async getCharacter(name: string): Promise<Character | null> {
    try {
      await this.ensureSeeded();
      const char = await characterRepository.findByName(name);
      if (char) return char;
    } catch {}
    const seed = DEFAULT_CHARACTERS.find((s) => s.name.toLowerCase() === name.toLowerCase());
    return seed ? this.toMockCharacter(seed) : null;
  }

  async getCharactersByNames(names: string[]): Promise<Character[]> {
    const results: Character[] = [];
    for (const name of names) {
      const char = await this.getCharacter(name);
      if (char) results.push(char);
    }
    return results;
  }


  /**
   * Generates a strict prompt descriptor for visual models and LLM scene generation
   * guaranteeing character visual consistency across scenes.
   */
  async buildCharacterConsistencyPrompt(characterNames: string[]): Promise<string> {
    const characters = await this.getCharactersByNames(characterNames);
    if (characters.length === 0) {
      return 'Characters: Original 3D animated cute characters with consistent clothing and colors.';
    }

    const descriptions = characters.map((c) => {
      return `[${c.name}]: ${c.bible}`;
    });

    return `CHARACTER CONSISTENCY BIBLE (Follow strictly, do NOT alter traits):\n${descriptions.join('\n')}`;
  }

  /**
   * Selects candidate characters for a new story idea, preferring under-utilized characters
   * to avoid audience fatigue.
   */
  async pickCharactersForStory(requestedCount: number = 2, excludeRecentNames: string[] = []): Promise<Character[]> {
    const all = await this.getAllCharacters();
    // Sort by appearance count ascending, prioritizing those not recently seen
    const filtered = all.filter((c) => !excludeRecentNames.includes(c.name));
    const pool = filtered.length >= requestedCount ? filtered : all;

    const sorted = [...pool].sort((a, b) => a.appearanceCount - b.appearanceCount);
    return sorted.slice(0, requestedCount);
  }
}

export const characterManager = new CharacterManager();
