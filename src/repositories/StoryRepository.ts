import { prisma } from '../config/database.js';
import { StoryIdea, Storyboard, Scene } from '@prisma/client';
import { StoryboardSceneItem, StoryIdeaInput, StoryScoreBreakdown } from '../types/index.js';

export class StoryRepository {
  async createStoryIdea(
    data: StoryIdeaInput & {
      scores: StoryScoreBreakdown;
      status?: string;
    }
  ): Promise<StoryIdea> {
    return prisma.storyIdea.create({
      data: {
        title: data.title,
        premise: data.concept,
        format: data.format,
        hookPattern: data.hookSceneDescription,
        emotionalArc: `${data.genre} - ${data.twistOrPayoff}`,
        characters: data.suggestedCharacters,
        storyScore: data.scores.finalScore,
        scoreBreakdown: data.scores as any,
        status: data.status || 'APPROVED',
      },
    });
  }

  async findStoryIdeaById(id: string): Promise<StoryIdea | null> {
    return prisma.storyIdea.findUnique({
      where: { id },
      include: {
        storyboard: {
          include: {
            scenes: {
              orderBy: { sceneIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  async getTopApprovedStory(excludeRecentFormats: string[] = []): Promise<StoryIdea | null> {
    const ideas = await prisma.storyIdea.findMany({
      where: {
        status: 'APPROVED',
        ...(excludeRecentFormats.length > 0 ? { format: { notIn: excludeRecentFormats } } : {}),
      },
      orderBy: { storyScore: 'desc' },
      take: 1,
    });

    if (ideas.length > 0) return ideas[0];

    // Fallback without format exclusion if none found
    return prisma.storyIdea.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { storyScore: 'desc' },
    });
  }

  async updateStoryIdeaStatus(id: string, status: string): Promise<StoryIdea> {
    return prisma.storyIdea.update({
      where: { id },
      data: { status },
    });
  }

  async createStoryboardWithScenes(
    storyIdeaId: string,
    targetDuration: number,
    scenes: StoryboardSceneItem[],
    characterMapByName: Map<string, string> = new Map()
  ): Promise<Storyboard & { scenes: Scene[] }> {
    return prisma.storyboard.create({
      data: {
        storyIdeaId,
        targetDuration,
        totalScenes: scenes.length,
        scenes: {
          create: scenes.map((s) => ({
            sceneIndex: s.sceneNumber,
            durationSeconds: s.durationSeconds,
            location: s.title,
            characterAction: s.action,
            dialogue: s.dialogue,
            speakerName: s.characterName,
            characterId: characterMapByName.get(s.characterName) || null,
            emotion: s.emotion || 'neutral',
            sfxCue: s.sfxCue || null,
            cameraAngle: s.cameraAngle || 'medium',
            visualPrompt: s.visualPrompt,
          })),
        },
      },
      include: {
        scenes: {
          orderBy: { sceneIndex: 'asc' },
        },
      },
    });
  }

  async findRecentUsedFormats(limit: number = 5): Promise<string[]> {
    const recentShorts = await prisma.short.findMany({
      where: {
        contentMode: 'cartoon',
        storyIdeaId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        storyIdea: {
          select: { format: true },
        },
      },
    });

    return recentShorts
      .map((s) => s.storyIdea?.format)
      .filter((fmt): fmt is string => Boolean(fmt));
  }

  async findAllIdeas(status?: string, limit: number = 50): Promise<StoryIdea[]> {
    return prisma.storyIdea.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const storyRepository = new StoryRepository();
