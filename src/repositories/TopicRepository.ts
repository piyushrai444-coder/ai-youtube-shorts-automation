import { prisma } from '../config/database.js';
import { Topic } from '@prisma/client';
import { ResearchResult } from '../types/index.js';

export class TopicRepository {
  async findByHash(contentHash: string): Promise<Topic | null> {
    return prisma.topic.findUnique({
      where: { contentHash },
    });
  }

  async findBySourceUrl(sourceUrl: string): Promise<Topic | null> {
    return prisma.topic.findFirst({
      where: { sourceUrl },
    });
  }

  async create(data: ResearchResult): Promise<Topic> {
    return prisma.topic.create({
      data: {
        title: data.title,
        source: data.source,
        sourceUrl: data.sourceUrl,
        summary: data.summary,
        category: data.category,
        publishedAt: data.publishedAt,
        contentHash: data.contentHash,
        score: data.score || 0.0,
      },
    });
  }

  async findUnused(limit: number = 20): Promise<Topic[]> {
    return prisma.topic.findMany({
      where: { used: false },
      orderBy: [
        { score: 'desc' },
        { discoveredAt: 'desc' },
      ],
      take: limit,
    });
  }

  async markUsed(id: string): Promise<Topic> {
    return prisma.topic.update({
      where: { id },
      data: { used: true },
    });
  }

  async listRecent(limit: number = 20): Promise<Topic[]> {
    return prisma.topic.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: limit,
      include: { shorts: true },
    });
  }
}

export const topicRepository = new TopicRepository();
