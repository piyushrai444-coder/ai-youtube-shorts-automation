import { JobRecoveryService } from '../src/jobs/JobRecoveryService';
import { jobRepository } from '../src/repositories/JobRepository';
import { shortRepository } from '../src/repositories/ShortRepository';
import { JobStatus, ShortStatus } from '@prisma/client';

describe('Job State Machine & Restart Recovery', () => {
  let recoveryService: JobRecoveryService;

  beforeEach(() => {
    recoveryService = new JobRecoveryService();
  });

  afterEach(() => {
    recoveryService.stop();
  });

  describe('Stuck Job Recovery', () => {
    it('should recover stuck running jobs and mark retryable if not uploaded', async () => {
      const mockStuckJob = {
        id: 'job-stuck-1',
        slotKey: '2026-10-02-short-1',
        jobType: 'DAILY_SHORT_1',
        status: JobStatus.RUNNING,
        shortId: 'short-123',
        retryCount: 0,
        startedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
      };

      jest.spyOn(jobRepository, 'findStuckJobs').mockResolvedValue([mockStuckJob as any]);
      const updateJobSpy = jest.spyOn(jobRepository, 'update').mockResolvedValue({} as any);
      const updateShortSpy = jest.spyOn(shortRepository, 'update').mockResolvedValue({} as any);
      jest.spyOn(shortRepository, 'findById').mockResolvedValue({
        id: 'short-123',
        status: ShortStatus.VIDEO_GENERATING,
        youtubeVideoId: null,
      } as any);

      await recoveryService.recoverStuckJobs();

      expect(updateShortSpy).toHaveBeenCalledWith('short-123', expect.objectContaining({
        status: ShortStatus.RETRY_PENDING,
      }));

      expect(updateJobSpy).toHaveBeenCalledWith('job-stuck-1', expect.objectContaining({
        status: JobStatus.FAILED,
        retryCount: 1,
      }));
    });

    it('should NOT retry a job if its Short was already successfully uploaded to YouTube', async () => {
      const mockStuckJob = {
        id: 'job-uploaded-1',
        slotKey: '2026-10-02-short-1',
        jobType: 'DAILY_SHORT_1',
        status: JobStatus.RUNNING,
        shortId: 'short-uploaded',
        retryCount: 0,
      };

      jest.spyOn(jobRepository, 'findStuckJobs').mockResolvedValue([mockStuckJob as any]);
      const updateJobSpy = jest.spyOn(jobRepository, 'update').mockResolvedValue({} as any);
      jest.spyOn(shortRepository, 'findById').mockResolvedValue({
        id: 'short-uploaded',
        status: ShortStatus.UPLOADED,
        youtubeVideoId: 'yt-video-123',
      } as any);

      await recoveryService.recoverStuckJobs();

      // Should mark job as COMPLETED and NOT retry
      expect(updateJobSpy).toHaveBeenCalledWith('job-uploaded-1', expect.objectContaining({
        status: JobStatus.COMPLETED,
      }));
    });
  });
});
