import { ShortSlot, generateSlotKey } from '../utils/idempotency.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { automationPipeline } from './AutomationPipeline.js';
import { logger } from '../utils/logger.js';
import { JobStatus, ShortStatus } from '@prisma/client';

export interface ScheduleTriggerResult {
  accepted: boolean;
  jobId?: string;
  slotKey: string;
  message: string;
  alreadyExists?: boolean;
}

export class JobScheduler {
  async triggerSlot(slot: ShortSlot, category?: string): Promise<ScheduleTriggerResult> {
    const slotKey = generateSlotKey(slot);
    logger.info(`Received trigger for slot: ${slotKey} (${slot})`);

    // 1. Check Idempotency: Has an active or completed job already run for this exact slot today?
    const existingJob = await jobRepository.findActiveBySlotKey(slotKey);
    if (existingJob) {
      logger.info(`Job already active for slot ${slotKey} (status: ${existingJob.status}). Ignoring duplicate request.`);
      return {
        accepted: false,
        jobId: existingJob.id,
        slotKey,
        message: `Job already in progress for slot ${slotKey}`,
        alreadyExists: true,
      };
    }

    const existingShort = await shortRepository.findBySlotKey(slotKey);
    if (existingShort && existingShort.status === ShortStatus.UPLOADED) {
      logger.info(`Short already completed and uploaded for slot ${slotKey}. Ignoring duplicate request.`);
      return {
        accepted: false,
        slotKey,
        message: `Short already generated and uploaded for slot ${slotKey}`,
        alreadyExists: true,
      };
    }

    // 2. Create JobRun record in DB
    const job = await jobRepository.create({
      slotKey,
      jobType: slot === 'manual' ? 'MANUAL' : `DAILY_${slot.toUpperCase().replace('-', '_')}`,
      status: JobStatus.PENDING,
    });

    // 3. Launch processing asynchronously in background (Non-blocking HTTP)
    setImmediate(async () => {
      try {
        await automationPipeline.execute({
          jobId: job.id,
          slotKey,
          jobType: job.jobType,
          category,
          shortId: existingShort?.id,
        });
      } catch (err: any) {
        logger.error(`Background job ${job.id} execution failed: ${err.message}`);
      }
    });

    return {
      accepted: true,
      jobId: job.id,
      slotKey,
      message: `Job queued successfully for slot ${slotKey}`,
      alreadyExists: false,
    };
  }

  async retryShort(shortId: string): Promise<ScheduleTriggerResult> {
    const short = await shortRepository.findById(shortId);
    if (!short) {
      throw new Error(`Short with id ${shortId} not found`);
    }

    const slotKey = short.slotKey || `retry-${short.id}-${Date.now()}`;
    const job = await jobRepository.create({
      slotKey,
      jobType: 'RETRY',
      shortId: short.id,
      status: JobStatus.PENDING,
    });

    setImmediate(async () => {
      try {
        await automationPipeline.execute({
          jobId: job.id,
          slotKey,
          jobType: 'RETRY',
          category: short.category,
          shortId: short.id,
        });
      } catch (err: any) {
        logger.error(`Background retry job ${job.id} failed: ${err.message}`);
      }
    });

    return {
      accepted: true,
      jobId: job.id,
      slotKey,
      message: `Retry job queued for Short ${shortId}`,
    };
  }
}

export const jobScheduler = new JobScheduler();
