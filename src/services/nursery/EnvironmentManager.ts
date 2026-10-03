import { EnvironmentProfile } from '../../types/index.js';
import { environmentRepository } from '../../repositories/EnvironmentRepository.js';
import { logger } from '../../utils/logger.js';

export const DEFAULT_ENVIRONMENTS: EnvironmentProfile[] = [
  {
    id: 'env-rainbow-playground',
    name: 'Rainbow Playground',
    category: 'outdoor',
    description: 'Vibrant outdoor preschool playground with rolling green grass hills, yellow spiral slide, wooden swings, and a sparkling rainbow overhead in a clear blue sky.',
    lighting: 'bright sunny day with warm joyful morning illumination',
    colorTheme: { primary: '#4ADE80', secondary: '#38BDF8', accent: '#FBBF24' },
    props: ['yellow slide', 'wooden swings', 'giant rainbow', 'colorful toy train', 'fluffy clouds'],
  },
  {
    id: 'env-sunny-classroom',
    name: 'Sunny Preschool Classroom',
    category: 'indoor',
    description: 'Cheerful preschool classroom featuring a giant round rainbow alphabet rug, wooden block corner, colorful picture books on low shelves, and child art hanging with clips.',
    lighting: 'soft natural window daylight with warm ambient glow',
    colorTheme: { primary: '#F472B6', secondary: '#FBBF24', accent: '#818CF8' },
    props: ['alphabet rug', 'wooden building blocks', 'art easels', 'crayon boxes', 'musical xylophone'],
  },
  {
    id: 'env-starry-bedroom',
    name: 'Starry Bedtime Room',
    category: 'indoor',
    description: 'Peaceful, cozy preschool nursery with glowing crescent moon nightlight, glowing star projections on the ceiling, soft lavender blankets, and teddy bears.',
    lighting: 'magical twilight with warm golden moonbeams and soft blue shadows',
    colorTheme: { primary: '#312E81', secondary: '#4338CA', accent: '#FDE047' },
    props: ['crescent moon lamp', 'fluffy pillows', 'cloud mobile', 'music box', 'storybook'],
  },
  {
    id: 'env-friendly-farm',
    name: 'Friendly Sunny Farm',
    category: 'outdoor',
    description: 'Charming preschool farm with a bright red wooden barn, clean white picket fence, blooming giant sunflowers, friendly little red tractor, and gentle rolling pastures.',
    lighting: 'golden morning sunshine with warm amber highlights',
    colorTheme: { primary: '#EF4444', secondary: '#84CC16', accent: '#EAB308' },
    props: ['red barn', 'sunflowers', 'wooden fence', 'red toy tractor', 'hay bales'],
  },
  {
    id: 'env-fruit-garden',
    name: 'Fruit & Color Garden',
    category: 'outdoor',
    description: 'Lush magical orchard with bright red apple trees, yellow lemon trees, purple blueberry bushes, neat garden beds with smiling vegetables, and buzzing cheerful bumblebees.',
    lighting: 'sparkling clear morning light with dewdrops and gentle sun rays',
    colorTheme: { primary: '#10B981', secondary: '#F97316', accent: '#A855F7' },
    props: ['apple tree', 'watering can', 'garden baskets', 'smiling carrots', 'butterflies'],
  },
  {
    id: 'env-bubble-bath',
    name: 'Bubble Bath Studio',
    category: 'indoor',
    description: 'Delightful preschool bathroom with a pastel blue tub overflowing with glistening rainbow bubbles, yellow rubber duckies, cheerful round mirrors, and soft fluffy towels.',
    lighting: 'sparkling warm bathroom lighting with iridescent bubble reflections',
    colorTheme: { primary: '#06B6D4', secondary: '#FDE047', accent: '#F472B6' },
    props: ['rubber duckies', 'rainbow soap bubbles', 'soft sponge', 'toothbrush', 'towel rack'],
  },
  {
    id: 'env-rhythm-beach',
    name: 'Rhythm Beach',
    category: 'outdoor',
    description: 'Gentle, sunny tropical shore with smooth golden sandcastles, gentle turquoise waves that tap in rhythm, twin coconut palm trees, and colorful seashell drums.',
    lighting: 'warm afternoon tropical glow with sparkling crystal ocean water',
    colorTheme: { primary: '#0EA5E9', secondary: '#F59E0B', accent: '#EC4899' },
    props: ['sandcastles', 'seashell drums', 'palm trees', 'beach ball', 'gentle waves'],
  },
];

export class EnvironmentManager {
  private seeded = false;

  async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      for (const env of DEFAULT_ENVIRONMENTS) {
        const existing = await environmentRepository.findByName(env.name);
        if (!existing) {
          await environmentRepository.create(env);
          logger.info(`[EnvironmentManager] Seeded preschool environment: ${env.name}`);
        }
      }
      this.seeded = true;
    } catch (err: any) {
      logger.debug(`[EnvironmentManager] DB seed note: ${err.message}. Using in-memory environments.`);
    }
  }

  async getAllEnvironments(): Promise<EnvironmentProfile[]> {
    await this.ensureSeeded();
    return DEFAULT_ENVIRONMENTS;
  }

  async getEnvironmentByName(name: string): Promise<EnvironmentProfile> {
    const found = DEFAULT_ENVIRONMENTS.find((e) => e.name.toLowerCase() === name.toLowerCase());
    return found || DEFAULT_ENVIRONMENTS[0];
  }

  selectEnvironmentForTheme(theme: string, contentMode: string): EnvironmentProfile {
    const t = `${theme} ${contentMode}`.toLowerCase();
    if (t.includes('bed') || t.includes('sleep') || t.includes('moon') || t.includes('night') || t.includes('star') || t.includes('lullaby')) {
      return this.getEnvironmentSync('Starry Bedtime Room');
    }
    if (t.includes('brush') || t.includes('wash') || t.includes('bath') || t.includes('soap') || t.includes('clean')) {
      return this.getEnvironmentSync('Bubble Bath Studio');
    }
    if (t.includes('farm') || t.includes('animal') || t.includes('tractor') || t.includes('cow') || t.includes('duck')) {
      return this.getEnvironmentSync('Friendly Sunny Farm');
    }
    if (t.includes('abc') || t.includes('school') || t.includes('class') || t.includes('number') || t.includes('count') || t.includes('shape')) {
      return this.getEnvironmentSync('Sunny Preschool Classroom');
    }
    if (t.includes('fruit') || t.includes('food') || t.includes('healthy') || t.includes('color') || t.includes('vegetable')) {
      return this.getEnvironmentSync('Fruit & Color Garden');
    }
    if (t.includes('beach') || t.includes('sea') || t.includes('wave') || t.includes('swim')) {
      return this.getEnvironmentSync('Rhythm Beach');
    }
    return this.getEnvironmentSync('Rainbow Playground');
  }

  private getEnvironmentSync(name: string): EnvironmentProfile {
    return DEFAULT_ENVIRONMENTS.find((e) => e.name === name) || DEFAULT_ENVIRONMENTS[0];
  }

  async buildEnvironmentPrompt(name: string): Promise<string> {
    const env = await this.getEnvironmentByName(name);
    return `3D Preschool Environment: ${env.name}. ${env.description} Lighting: ${env.lighting}. Props: ${env.props.join(', ')}. Atmosphere: pastel rainbow slides, high preschool engagement, bright and joyful.`;
  }

  async incrementUsage(name: string): Promise<void> {
    try {
      const dbEnv = await environmentRepository.findByName(name);
      if (dbEnv) {
        await environmentRepository.incrementUsage(dbEnv.id);
      }
    } catch {}
  }
}

export const environmentManager = new EnvironmentManager();
