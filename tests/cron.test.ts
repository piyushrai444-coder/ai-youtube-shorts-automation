import { cronAuth } from '../src/middleware/cronAuth';
import { cronController } from '../src/controllers/CronController';
import { config } from '../src/config';
import { jobScheduler } from '../src/jobs/JobScheduler';

describe('Cron-job.org Authentication & Idempotency', () => {
  const validSecret = config.cron.secret;

  describe('Cron Authentication Middleware', () => {
    it('should reject request without Authorization header with 401', () => {
      const req: any = { headers: {}, path: '/api/cron/generate-short-1' };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      cronAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with incorrect token with 401', () => {
      const req: any = {
        headers: { authorization: 'Bearer incorrect-token-12345' },
        path: '/api/cron/generate-short-1',
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      cronAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow request with valid Bearer token', () => {
      const req: any = {
        headers: { authorization: `Bearer ${validSecret}` },
        path: '/api/cron/generate-short-1',
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      cronAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Cron Controller Endpoints & Idempotency', () => {
    it('should accept and queue Short 1 trigger with 202', async () => {
      jest.spyOn(jobScheduler, 'triggerSlot').mockResolvedValueOnce({
        accepted: true,
        jobId: 'job-short-1',
        slotKey: '2026-10-02-short-1',
        message: 'Job queued successfully',
        alreadyExists: false,
      });

      const req: any = { body: {}, query: {} };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await cronController.handleShort1(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          slot: 'short-1',
          jobId: 'job-short-1',
        })
      );
    });

    it('should accept and queue Short 2 trigger with 202', async () => {
      jest.spyOn(jobScheduler, 'triggerSlot').mockResolvedValueOnce({
        accepted: true,
        jobId: 'job-short-2',
        slotKey: '2026-10-02-short-2',
        message: 'Job queued successfully',
        alreadyExists: false,
      });

      const req: any = { body: {}, query: {} };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await cronController.handleShort2(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          slot: 'short-2',
          jobId: 'job-short-2',
        })
      );
    });

    it('should prevent duplicate short creation if slot was already completed today', async () => {
      jest.spyOn(jobScheduler, 'triggerSlot').mockResolvedValueOnce({
        accepted: false,
        slotKey: '2026-10-02-short-1',
        message: 'Short already generated and uploaded for slot 2026-10-02-short-1',
        alreadyExists: true,
      });

      const req: any = { body: {}, query: {} };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await cronController.handleShort1(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          alreadyExists: true,
        })
      );
    });
  });
});
