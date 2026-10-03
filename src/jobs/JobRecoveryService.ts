import { jobRepository } from '../repositories/JobRepository.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { automationPipeline } from './AutomationPipeline.js';
import { JobStatus, ShortStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

export class JobRecoveryService {
  private timer: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    logger.info('Initializing Job Recovery Service...');
    await this.recoverStuckJobs();

    // Check periodically every 5 minutes for retryable jobs
    this.timer = setInterval(() => {
      this.processRetryQueue().catch((err) => {
        logger.error(`Error processing retry queue: ${err.message}`);
      });
    }, 5 * 60 * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async recoverStuckJobs(): Promise<void> {
    try {
      // Find jobs that have been RUNNING for more than 15 minutes (indicating a crash or Render restart)
      const stuckJobs = await jobRepository.findStuckJobs(15);
      if (stuckJobs.length === 0) {
        logger.info('No stuck jobs found on startup.');
        return;
      }

      logger.warn(`Found ${stuckJobs.length} stuck jobs from previous process run. Initiating recovery...`);

      for (const job of stuckJobs) {
        logger.job(job.id, `Recovering stuck job ${job.id} for slot ${job.slotKey}`);

        // Check associated Short
        if (job.shortId) {
          const short = await shortRepository.findById(job.shortId);
          if (short) {
            // If video was already uploaded to YouTube, do NOT retry, mark job as completed!
            if (short.status === ShortStatus.UPLOADED && short.youtubeVideoId) {
              logger.job(job.id, 'Short was already uploaded. Marking job as COMPLETED.');
              await jobRepository.update(job.id, {
                status: JobStatus.COMPLETED,
                completedAt: new Date(),
              });
              continue;
            }

            // Otherwise mark as failed with recovery note
            await shortRepository.update(short.id, {
              status: ShortStatus.RETRY_PENDING,
              errorMessage: 'Job interrupted due to instance restart. Ready for retry.',
            });
          }
        }

        // Schedule for retry
        const retryCount = job.retryCount + 1;
        const nextRetryAt = new Date(Date.now() + 60 * 1000); // retry in 1 minute

        await jobRepository.update(job.id, {
          status: JobStatus.FAILED,
          errorMessage: 'Process terminated or restarted while job was running',
          retryCount,
          nextRetryAt,
        });
      }
    } catch (err: any) {
      logger.error(`Job recovery failed: ${err.message}`);
    }
  }

  async processRetryQueue(): Promise<void> {
    try {
      const retryableJobs = await jobRepository.findRetryableJobs();
      for (const job of retryableJobs) {
        if (!job.slotKey) continue;
        logger.job(job.id, `Auto-retrying scheduled job ${job.id} for slot ${job.slotKey}`);

        // Re-execute pipeline
        setImmediate(async () => {
          try {
            await automationPipeline.execute({
              jobId: job.id,
              slotKey: job.slotKey!,
              jobType: job.jobType,
              shortId: job.shortId || undefined,
            });
          } catch (err: any) {
            logger.error(`Retry execution for job ${job.id} failed: ${err.message}`);
          }
        });
      }
    } catch (err: any) {
      logger.error(`Error in processRetryQueue: ${err.message}`);
    }
  }
}

export const jobRecoveryService = new JobRecoveryService();
