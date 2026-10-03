import { prisma } from '../config/database.js';
import { Song, Compilation } from '@prisma/client';
import { ScoredSongIdea, StructuredSongLyrics } from '../types/index.js';

export interface CreateSongInput {
  title: string;
  theme: string;
  contentMode: string;
  videoType?: string;
  aspectRatio?: string;
  targetAgeGroup?: string;
  learningObjective?: string;
  emotionalTone?: string;
  bpm: number;
  musicalKey: string;
  musicStyle: string;
  lyricsStructured: StructuredSongLyrics;
  characters: string[];
  environmentName: string;
  durationSeconds: number;
  songScore: number;
  scoreBreakdown?: any;
  status?: string;
}

export class SongRepository {
  async create(data: CreateSongInput): Promise<Song> {
    return prisma.song.create({
      data: {
        title: data.title,
        theme: data.theme,
        contentMode: data.contentMode,
        videoType: data.videoType || 'SHORT',
        aspectRatio: data.aspectRatio || '9:16',
        targetAgeGroup: data.targetAgeGroup || '3-5',
        learningObjective: data.learningObjective || null,
        emotionalTone: data.emotionalTone || 'cheerful',
        bpm: data.bpm,
        musicalKey: data.musicalKey,
        musicStyle: data.musicStyle,
        lyricsStructured: data.lyricsStructured as any,
        characters: data.characters,
        environmentName: data.environmentName,
        durationSeconds: data.durationSeconds,
        songScore: data.songScore,
        scoreBreakdown: data.scoreBreakdown || null,
        status: data.status || 'APPROVED',
      },
    });
  }

  async findById(id: string): Promise<Song | null> {
    return prisma.song.findUnique({
      where: { id },
    });
  }

  async findAll(limit: number = 50, contentMode?: string): Promise<Song[]> {
    return prisma.song.findMany({
      where: contentMode ? { contentMode } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async update(id: string, data: any): Promise<Song> {
    return prisma.song.update({
      where: { id },
      data: data as any,
    });
  }

  async findTopApprovedSong(excludeThemes: string[] = []): Promise<Song | null> {
    const songs = await prisma.song.findMany({
      where: {
        status: 'APPROVED',
        ...(excludeThemes.length > 0 ? { theme: { notIn: excludeThemes } } : {}),
      },
      orderBy: { songScore: 'desc' },
      take: 1,
    });

    if (songs.length > 0) return songs[0];

    return prisma.song.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { songScore: 'desc' },
    });
  }

  async findRecentThemes(limit: number = 8): Promise<string[]> {
    const recent = await prisma.song.findMany({
      where: { status: { in: ['PRODUCED', 'UPLOADED'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { theme: true },
    });
    return recent.map((s) => s.theme);
  }

  async createCompilation(data: {
    title: string;
    description: string;
    totalDuration: number;
    songIds: string[];
  }): Promise<Compilation> {
    return prisma.compilation.create({
      data: {
        title: data.title,
        description: data.description,
        totalDuration: data.totalDuration,
        items: {
          create: data.songIds.map((songId, index) => ({
            songId,
            orderIndex: index + 1,
            transition: 'crossfade',
          })),
        },
      },
    });
  }
}

export const songRepository = new SongRepository();
