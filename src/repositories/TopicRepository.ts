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

  async create(data: ResearchResult & Partial<{
    freshnessScore: number;
    trendScore: number;
    usefulnessScore: number;
    visualScore: number;
    finalScore: number;
    sourceCount: number;
    company: string;
  }>): Promise<Topic> {
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
        freshnessScore: data.freshnessScore || 0.0,
        trendScore: data.trendScore || 0.0,
        usefulnessScore: data.usefulnessScore || 0.0,
        visualScore: data.visualScore || 0.0,
        finalScore: data.finalScore || data.score || 0.0,
        sourceCount: data.sourceCount || 1,
        company: data.company || null,
      },
    });
  }

  async updateScores(id: string, scores: {
    freshnessScore?: number;
    trendScore?: number;
    usefulnessScore?: number;
    visualScore?: number;
    finalScore?: number;
    sourceCount?: number;
    company?: string;
  }): Promise<Topic> {
    return prisma.topic.update({
      where: { id },
      data: scores,
    });
  }

  async findUnused(limit: number = 20, category?: string): Promise<Topic[]> {
    const where: any = { used: false };
    if (category) {
      where.category = category;
    }
    return prisma.topic.findMany({
      where,
      orderBy: [
        { finalScore: 'desc' },
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
      orderBy: [
        { finalScore: 'desc' },
        { discoveredAt: 'desc' },
      ],
      take: limit,
      include: { shorts: true, hookVariants: true },
    });
  }
}

export const topicRepository = new TopicRepository();
