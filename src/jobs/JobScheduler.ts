import { ShortSlot, generateSlotKey } from '../utils/idempotency.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { settingRepository } from '../repositories/SettingRepository.js';
import { automationPipeline } from './AutomationPipeline.js';
import { cartoonPipeline } from './CartoonPipeline.js';
import { nurseryPipeline } from './NurseryPipeline.js';
import { config } from '../config/index.js';
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
  private async getEffectiveMode(slot?: ShortSlot): Promise<'nursery_rhymes' | 'cartoon' | 'ai_tools'> {
    const dbMode = await settingRepository.get('content_mode');
    const configuredMode = (dbMode || config.contentMode || 'nursery_rhymes').toLowerCase();

    if (configuredMode === 'hybrid') {
      // In hybrid mode: Morning slot is nursery rhymes, evening slot is AI tools
      return slot === 'short-2' ? 'ai_tools' : 'nursery_rhymes';
    }
    if (configuredMode === 'ai_tools') return 'ai_tools';
    if (configuredMode === 'cartoon') return 'cartoon';
    return 'nursery_rhymes';
  }

  async triggerSlot(slot: ShortSlot, category?: string, explicitMode?: 'nursery_rhymes' | 'cartoon' | 'ai_tools'): Promise<ScheduleTriggerResult> {
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

    const effectiveMode = explicitMode || (await this.getEffectiveMode(slot));

    // 2. Create JobRun record in DB
    const job = await jobRepository.create({
      slotKey,
      jobType: slot === 'manual' ? `MANUAL_${effectiveMode.toUpperCase()}` : `DAILY_${slot.toUpperCase().replace('-', '_')}`,
      status: JobStatus.PENDING,
    });

    // 3. Launch processing asynchronously in background (Non-blocking HTTP)
    setImmediate(async () => {
      try {
        const pipelineOptions = {
          jobId: job.id,
          slotKey,
          jobType: job.jobType,
          category,
          shortId: existingShort?.id,
        };

        if (effectiveMode === 'nursery_rhymes') {
          await nurseryPipeline.execute(pipelineOptions);
        } else if (effectiveMode === 'cartoon') {
          await cartoonPipeline.execute(pipelineOptions);
        } else {
          await automationPipeline.execute(pipelineOptions);
        }
      } catch (err: any) {
        logger.error(`Background job ${job.id} execution failed: ${err.message}`);
      }
    });

    return {
      accepted: true,
      jobId: job.id,
      slotKey,
      message: `Job queued successfully for slot ${slotKey} in [${effectiveMode.toUpperCase()}] mode`,
      alreadyExists: false,
    };
  }

  async retryShort(shortId: string): Promise<ScheduleTriggerResult> {
    const short = await shortRepository.findById(shortId);
    if (!short) {
      throw new Error(`Short with id ${shortId} not found`);
    }

    const slotKey = short.slotKey || `retry-${short.id}-${Date.now()}`;
    const mode = short.contentMode === 'nursery_rhymes'
      ? 'nursery_rhymes'
      : short.contentMode === 'cartoon'
        ? 'cartoon'
        : (await this.getEffectiveMode());

    const job = await jobRepository.create({
      slotKey,
      jobType: `RETRY_${mode.toUpperCase()}`,
      shortId: short.id,
      status: JobStatus.PENDING,
    });

    setImmediate(async () => {
      try {
        const pipelineOptions = {
          jobId: job.id,
          slotKey,
          jobType: 'RETRY',
          category: short.category,
          shortId: short.id,
        };

        if (mode === 'nursery_rhymes') {
          await nurseryPipeline.execute(pipelineOptions);
        } else if (mode === 'cartoon') {
          await cartoonPipeline.execute(pipelineOptions);
        } else {
          await automationPipeline.execute(pipelineOptions);
        }
      } catch (err: any) {
        logger.error(`Background retry job ${job.id} failed: ${err.message}`);
      }
    });

    return {
      accepted: true,
      jobId: job.id,
      slotKey,
      message: `Retry job queued for Short ${shortId} in [${mode.toUpperCase()}] mode`,
    };
  }
}

export const jobScheduler = new JobScheduler();

