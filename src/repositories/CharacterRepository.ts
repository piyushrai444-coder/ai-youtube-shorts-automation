import { prisma } from '../config/database.js';
import { Character } from '@prisma/client';

export interface CreateCharacterInput {
  name: string;
  species: string;
  ageGroup?: string;
  personality: string[];
  appearance: Record<string, any>;
  clothing: Record<string, any>;
  voiceProfile: Record<string, any>;
  referenceImage?: string;
  bible: string;
}

export class CharacterRepository {
  async findAll(): Promise<Character[]> {
    return prisma.character.findMany({
      orderBy: { appearanceCount: 'desc' },
    });
  }

  async findById(id: string): Promise<Character | null> {
    return prisma.character.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Character | null> {
    return prisma.character.findUnique({
      where: { name },
    });
  }

  async create(data: CreateCharacterInput): Promise<Character> {
    return prisma.character.create({
      data: {
        name: data.name,
        species: data.species,
        ageGroup: data.ageGroup || 'young',
        personality: data.personality,
        appearance: data.appearance,
        clothing: data.clothing,
        voiceProfile: data.voiceProfile,
        referenceImage: data.referenceImage || null,
        bible: data.bible,
      },
    });
  }

  async update(id: string, data: Partial<CreateCharacterInput> & { avgRetention?: number; avgViews?: number; appearanceCount?: number }): Promise<Character> {
    return prisma.character.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async incrementAppearance(idOrName: string): Promise<Character | null> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
      const where = isUuid ? { id: idOrName } : { name: idOrName };
      const existing = await prisma.character.findFirst({ where });
      if (!existing) return null;
      return await prisma.character.update({
        where: { id: existing.id },
        data: {
          appearanceCount: { increment: 1 },
        },
      });
    } catch {
      return null;
    }
  }

  async updatePerformance(id: string, newRetention: number, newViews: number): Promise<Character> {
    const char = await this.findById(id);
    if (!char) throw new Error(`Character ${id} not found`);

    const count = Math.max(char.appearanceCount, 1);
    const updatedAvgRetention = Number(((char.avgRetention * (count - 1) + newRetention) / count).toFixed(2));
    const updatedAvgViews = Math.round((char.avgViews * (count - 1) + newViews) / count);

    return prisma.character.update({
      where: { id },
      data: {
        avgRetention: updatedAvgRetention,
        avgViews: updatedAvgViews,
      },
    });
  }

  async getRecentAppearedNames(lastNShorts: number = 5): Promise<string[]> {
    const recentShorts = await prisma.short.findMany({
      where: { contentMode: 'cartoon' },
      orderBy: { createdAt: 'desc' },
      take: lastNShorts,
      select: { characterIds: true },
    });

    const charIds = new Set<string>();
    recentShorts.forEach((s) => {
      s.characterIds?.forEach((cid) => charIds.add(cid));
    });

    if (charIds.size === 0) return [];

    const chars = await prisma.character.findMany({
      where: { id: { in: Array.from(charIds) } },
      select: { name: true },
    });

    return chars.map((c) => c.name);
  }
}

export const characterRepository = new CharacterRepository();
