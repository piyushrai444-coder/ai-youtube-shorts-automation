import { KidsCharacterProfile } from '../../types/index.js';
import { characterRepository } from '../../repositories/CharacterRepository.js';
import { logger } from '../../utils/logger.js';

export const PRESCHOOL_CAST: KidsCharacterProfile[] = [
  {
    id: 'char-leo',
    name: 'Leo',
    species: 'Golden Lion Cub',
    personality: 'curious, energetic, encouraging leader, playful',
    visualStyle: '3D preschool cute cartoon, rounded friendly proportions, big amber eyes, sunny-yellow t-shirt with rainbow sun emblem',
    signatureItem: 'Sunny-yellow t-shirt with rainbow sun',
    colorPalette: 'warm golden amber and sunny yellow',
    voicePersona: 'en-US-AnaNeural',
    singingVoiceProfile: {
      voiceName: 'en-US-AnaNeural',
      style: 'cheerful and energetic',
      pitchOffset: '+4Hz',
      vocalType: 'lead',
    },
    danceStyle: 'Bouncy high-knee skips and rhythmic double claps',
    signatureMove: 'JUMP',
    expressions: {
      happy: 'Wide radiant smile with sparkling amber eyes',
      sad: 'Gentle downturned mouth with big soft puppy-dog eyes',
      surprised: 'Mouth rounded into an "O" with wide alert ears',
      excited: 'Bouncing with starry eyes and wide open mouth grin',
      singing: 'Open smiling mouth, cheeks lifted in song',
    },
    poses: {
      dancing: 'Arms outstretched side to side, one foot lifted in rhythm',
      jumping: 'Mid-air leap with knees tucked and paws high',
      clapping: 'Paws together in front of chest with rhythmic bounce',
      spinning: 'Whirling turn with tail swaying outward',
      marching: 'High-stepping forward march with arms pumping in beat',
    },
  },
  {
    id: 'char-mia',
    name: 'Mia',
    species: 'White Bunny',
    personality: 'sweet, gentle, observant, loves colors and dancing',
    visualStyle: '3D preschool cute cartoon, fluffy white coat, pink-lined floppy ears, pastel turquoise overalls with daisy button',
    signatureItem: 'Turquoise overalls with daisy button',
    colorPalette: 'soft white, pastel turquoise and gentle pink',
    voicePersona: 'en-US-JennyNeural',
    singingVoiceProfile: {
      voiceName: 'en-US-JennyNeural',
      style: 'melodic, sweet, and playful',
      pitchOffset: '+2Hz',
      vocalType: 'lead',
    },
    danceStyle: 'Graceful pirouettes and rhythmic toe taps',
    signatureMove: 'SPIN',
    expressions: {
      happy: 'Beaming smile with nose wiggling playfully',
      sad: 'Ears drooping slightly with gentle caring look',
      surprised: 'Both long ears standing straight up in wonder',
      excited: 'Cheeks blushing with joyous open smile',
      singing: 'Sweet expressive singing mouth with eyes twinkling',
    },
    poses: {
      dancing: 'One toe pointed with arms gracefully arched',
      jumping: 'Light bunny hop with ears fluttering back',
      clapping: 'Delicate clap in front of chest',
      spinning: 'Full 360 spin with overalls twirling',
      marching: 'Delightful skipping step with head tilting left and right',
    },
  },
  {
    id: 'char-toby',
    name: 'Toby',
    species: 'Green Turtle',
    personality: 'clever, calm, curious, loves numbers and shapes',
    visualStyle: '3D preschool cute cartoon, bright emerald green skin, soft teal patterned shell, navy blue explorer cap',
    signatureItem: 'Navy blue explorer cap with little compass badge',
    colorPalette: 'emerald green, teal, and navy blue',
    voicePersona: 'en-US-GuyNeural',
    singingVoiceProfile: {
      voiceName: 'en-US-GuyNeural',
      style: 'warm, steady, and rhythmic',
      pitchOffset: '-2Hz',
      vocalType: 'chorus',
    },
    danceStyle: 'Steady marching steps and fun head bobbing',
    signatureMove: 'MARCH',
    expressions: {
      happy: 'Broad, warm friendly grin behind shiny round eyes',
      sad: 'Head tucked slightly toward shell with thoughtful brow',
      surprised: 'Eyes wide behind glasses in delight',
      excited: 'Both arms raised high with broad happy cheer',
      singing: 'Steady melodic mouth posture in time with the tempo',
    },
    poses: {
      dancing: 'Side-to-side step with rhythmic shell sway',
      jumping: 'Sturdy little hop landing firmly on both feet',
      clapping: 'Steady beat clapping on count 1 and 3',
      spinning: 'Slow cheerful spin with thumbs up',
      marching: 'Firm, steady rhythmic parade march',
    },
  },
  {
    id: 'char-ella',
    name: 'Ella',
    species: 'Baby Elephant',
    personality: 'joyful, playful, loves music and big dance steps',
    visualStyle: '3D preschool cute cartoon, soft lavender-grey skin, big heart-shaped ears, purple polka-dot bow on left ear',
    signatureItem: 'Purple polka-dot hair bow',
    colorPalette: 'lavender-grey, violet, and sunny yellow',
    voicePersona: 'en-US-AriaNeural',
    singingVoiceProfile: {
      voiceName: 'en-US-AriaNeural',
      style: 'upbeat, bright, and cheerful',
      pitchOffset: '+3Hz',
      vocalType: 'call_response',
    },
    danceStyle: 'Big friendly stomps and joyful trunk waving',
    signatureMove: 'STOMP',
    expressions: {
      happy: 'Eyes crinkling with infectious baby elephant joy',
      sad: 'Little trunk curled softly inward',
      surprised: 'Ears flapping forward in astonishment',
      excited: 'Trunk raised in a joyful greeting trumpet pose',
      singing: 'Full-throated cheerful singing with trunk curving upward',
    },
    poses: {
      dancing: 'Side-to-side stomp in time with the bass drum',
      jumping: 'Bouncy double foot landing with joyous laughter',
      clapping: 'Ears flapping in sync with paws clapping',
      spinning: 'Playful wide spin with trunk outstretched',
      marching: 'Big fun stomping march making friendly boom-boom beats',
    },
  },
  {
    id: 'char-owl',
    name: 'Professor Owl',
    species: 'Barn Owl Teacher',
    personality: 'wise, warm, encouraging preschool teacher, narrator',
    visualStyle: '3D preschool cute cartoon, fluffy golden-brown feathers, round brass spectacles, cozy blue knitted cardigan',
    signatureItem: 'Round brass spectacles and wooden pointer',
    colorPalette: 'golden honey-brown, creamy white, and navy',
    voicePersona: 'en-US-ChristopherNeural',
    singingVoiceProfile: {
      voiceName: 'en-US-ChristopherNeural',
      style: 'warm, friendly, and narrative',
      pitchOffset: '0Hz',
      vocalType: 'lead',
    },
    danceStyle: 'Gentle wing conducting and encouraging nodding',
    signatureMove: 'POINT',
    expressions: {
      happy: 'Warm grandfatherly smile behind round spectacles',
      sad: 'Kind reassuring nod with gentle brow',
      surprised: 'Spectacles pushed down nose with wide inquiring eyes',
      excited: 'Wings fluttering in enthusiastic applause',
      singing: 'Clear, resonant diction leading the sing-along',
    },
    poses: {
      dancing: 'Gentle wing sway side to side in tempo',
      jumping: 'Gentle hover above the ground with wings open',
      clapping: 'Wingtip applause encouraging the children',
      spinning: 'Graceful slow turn pointing to the rainbow/board',
      marching: 'Conducting the rhythm with steady wing taps',
    },
  },
];

export class KidsCharacterManager {
  private seeded = false;

  async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      for (const char of PRESCHOOL_CAST) {
        const existing = await characterRepository.findByName(char.name);
        if (!existing) {
          await characterRepository.create({
            name: char.name,
            species: char.species,
            ageGroup: 'preschool',
            personality: char.personality.split(',').map((p) => p.trim()),
            appearance: {
              visualStyle: char.visualStyle,
              signatureItem: char.signatureItem,
              colorPalette: char.colorPalette,
              expressions: char.expressions,
              poses: char.poses,
            },
            clothing: {
              item: char.signatureItem,
            },
            voiceProfile: {
              voiceName: char.voicePersona,
              singing: char.singingVoiceProfile,
              danceStyle: char.danceStyle,
              signatureMove: char.signatureMove,
            },
            bible: `${char.name} is a preschool ${char.species}. ${char.visualStyle}. Signature Move: ${char.signatureMove}. Never alter appearance or color palette. 3D preschool cute cartoon aesthetic.`,
          });
          logger.info(`[KidsCharacterManager] Seeded preschool cast member: ${char.name}`);
        }
      }
      this.seeded = true;
    } catch (err: any) {
      logger.debug(`[KidsCharacterManager] DB seed note: ${err.message}. Using in-memory preschool cast.`);
    }
  }

  async getAllKidsCharacters(): Promise<KidsCharacterProfile[]> {
    await this.ensureSeeded();
    return PRESCHOOL_CAST;
  }

  async getKidsCharacter(name: string): Promise<KidsCharacterProfile | null> {
    const found = PRESCHOOL_CAST.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return found || null;
  }

  async pickCastForSong(requestedCount: number = 3, excludeNames: string[] = []): Promise<KidsCharacterProfile[]> {
    const pool = PRESCHOOL_CAST.filter((c) => !excludeNames.includes(c.name));
    const selection = pool.length >= requestedCount ? pool : PRESCHOOL_CAST;
    return selection.slice(0, requestedCount);
  }

  buildPreschoolConsistencyPrompt(characterNames: string[]): string {
    const profiles = characterNames
      .map((name) => PRESCHOOL_CAST.find((c) => c.name.toLowerCase() === name.toLowerCase()))
      .filter((c): c is KidsCharacterProfile => Boolean(c));

    const lines = profiles.map((p) => {
      return `[${p.name} - ${p.species}]: ${p.visualStyle}. Outfit: ${p.signatureItem}. Dance Move: ${p.signatureMove}. Strictly preserve exact facial structure and colors.`;
    });

    return `PRESCHOOL CHARACTER CONSISTENCY BIBLE (Strict):\n${lines.join('\n')}`;
  }

  async buildCharacterConsistencyPrompt(characterNames: string[]): Promise<string> {
    return this.buildPreschoolConsistencyPrompt(characterNames);
  }

  async getAllCharacters(): Promise<KidsCharacterProfile[]> {
    return this.getAllKidsCharacters();
  }

  async incrementAppearances(name: string): Promise<void> {
    try {
      const dbChar = await characterRepository.findByName(name);
      if (dbChar) {
        await characterRepository.incrementAppearance(dbChar.id);
      }
    } catch {}
  }
}

export const DEFAULT_KIDS_CHARACTERS = PRESCHOOL_CAST;
export const kidsCharacterManager = new KidsCharacterManager();
