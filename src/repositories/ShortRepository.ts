import { prisma } from '../config/database.js';
import { Short, ShortStatus, Prisma } from '@prisma/client';

export class ShortRepository {
  async findBySlotKey(slotKey: string): Promise<Short | null> {
    return prisma.short.findUnique({
      where: { slotKey },
      include: { topic: true },
    });
  }

  async findById(id: string): Promise<(Short & { topic: any }) | null> {
    return prisma.short.findUnique({
      where: { id },
      include: { topic: true },
    });
  }

  async create(data: Prisma.ShortCreateInput): Promise<Short> {
    return prisma.short.create({
      data,
      include: { topic: true },
    });
  }

  async update(id: string, data: Prisma.ShortUpdateInput): Promise<Short | null> {
    try {
      return await prisma.short.update({
        where: { id },
        data,
        include: { topic: true },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return null;
      }
      throw err;
    }
  }

  async updateStatus(
    id: string,
    status: ShortStatus,
    extra: Partial<Prisma.ShortUpdateInput> = {}
  ): Promise<Short | null> {
    try {
      return await prisma.short.update({
        where: { id },
        data: {
          status,
          ...extra,
        },
        include: { topic: true },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return null;
      }
      throw err;
    }
  }

  async listRecent(limit: number = 20, offset: number = 0, status?: ShortStatus): Promise<Short[]> {
    const where: Prisma.ShortWhereInput = status ? { status } : {};
    return prisma.short.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { topic: true },
    });
  }

  async countTotal(status?: ShortStatus): Promise<number> {
    const where: Prisma.ShortWhereInput = status ? { status } : {};
    return prisma.short.count({ where });
  }

  async getTodayStats(datePrefix: string): Promise<{
    generated: number;
    uploaded: number;
    failed: number;
    pending: number;
  }> {
    // Find all shorts created with slotKey matching datePrefix or createdAt today
    const shorts = await prisma.short.findMany({
      where: {
        OR: [
          { slotKey: { startsWith: datePrefix } },
          { createdAt: { gte: new Date(`${datePrefix}T00:00:00.000Z`) } },
        ],
      },
      select: { status: true },
    });

    let generated = shorts.length;
    let uploaded = 0;
    let failed = 0;
    let pending = 0;

    for (const s of shorts) {
      if (s.status === 'UPLOADED') {
        uploaded++;
      } else if (s.status === 'FAILED' || s.status === 'VALIDATION_FAILED' || s.status === 'CANCELLED') {
        failed++;
      } else {
        pending++;
      }
    }

    return { generated, uploaded, failed, pending };
  }

  async delete(id: string): Promise<Short> {
    return prisma.short.delete({
      where: { id },
    });
  }

  async findUploadedWithVideoId(limit: number = 50): Promise<Short[]> {
    return prisma.short.findMany({
      where: {
        status: ShortStatus.UPLOADED,
        youtubeVideoId: { not: null },
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      include: {
        topic: true,
        performanceSnapshots: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async listUploadedForAnalysis(limit: number = 100): Promise<(Short & { performanceSnapshots: any[] })[]> {
    return prisma.short.findMany({
      where: {
        status: ShortStatus.UPLOADED,
        youtubeVideoId: { not: null },
      },
      include: {
        performanceSnapshots: {
          orderBy: { fetchedAt: 'desc' },
        },
        topic: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
    });
  }
}

export const shortRepository = new ShortRepository();
