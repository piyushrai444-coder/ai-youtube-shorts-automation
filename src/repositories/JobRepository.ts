import { prisma } from '../config/database.js';
import { JobRun, JobStatus, Prisma } from '@prisma/client';

export class JobRepository {
  async create(data: {
    slotKey?: string;
    jobType: string;
    status?: JobStatus;
    shortId?: string;
    metadata?: any;
  }): Promise<JobRun> {
    return prisma.jobRun.create({
      data: {
        slotKey: data.slotKey,
        jobType: data.jobType,
        status: data.status || JobStatus.PENDING,
        shortId: data.shortId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }

  async update(id: string, data: Prisma.JobRunUpdateInput): Promise<JobRun> {
    return prisma.jobRun.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<JobRun | null> {
    return prisma.jobRun.findUnique({
      where: { id },
    });
  }

  async findBySlotKey(slotKey: string): Promise<JobRun | null> {
    return prisma.jobRun.findFirst({
      where: { slotKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveBySlotKey(slotKey: string): Promise<JobRun | null> {
    return prisma.jobRun.findFirst({
      where: {
        slotKey,
        status: { in: [JobStatus.PENDING, JobStatus.RUNNING] },
      },
    });
  }

  async findStuckJobs(olderThanMinutes: number = 15): Promise<JobRun[]> {
    const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return prisma.jobRun.findMany({
      where: {
        status: JobStatus.RUNNING,
        startedAt: { lt: threshold },
      },
    });
  }

  async findRetryableJobs(): Promise<JobRun[]> {
    const now = new Date();
    return prisma.jobRun.findMany({
      where: {
        status: JobStatus.FAILED,
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: 'asc' },
    });
  }

  async listRecent(limit: number = 20): Promise<JobRun[]> {
    return prisma.jobRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const jobRepository = new JobRepository();
