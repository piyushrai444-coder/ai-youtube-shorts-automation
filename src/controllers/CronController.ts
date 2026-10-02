import { Request, Response } from 'express';
import { jobScheduler } from '../jobs/JobScheduler.js';
import { logger } from '../utils/logger.js';
import { ShortSlot } from '../utils/idempotency.js';

export class CronController {
  async handleShort1(req: Request, res: Response): Promise<void> {
    try {
      const category = req.body?.category || req.query?.category as string;
      const result = await jobScheduler.triggerSlot('short-1', category);

      const status = result.accepted ? 202 : 200;
      res.status(status).json({
        success: result.accepted,
        slot: 'short-1',
        ...result,
      });
    } catch (err: any) {
      logger.error(`Error in cron generate-short-1: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async handleShort2(req: Request, res: Response): Promise<void> {
    try {
      const category = req.body?.category || req.query?.category as string;
      const result = await jobScheduler.triggerSlot('short-2', category);

      const status = result.accepted ? 202 : 200;
      res.status(status).json({
        success: result.accepted,
        slot: 'short-2',
        ...result,
      });
    } catch (err: any) {
      logger.error(`Error in cron generate-short-2: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  async handleGenericCron(req: Request, res: Response): Promise<void> {
    try {
      const slotParam = (req.body?.slot || req.query?.slot || 'short-1') as ShortSlot;
      const category = req.body?.category || req.query?.category as string;

      const validSlot: ShortSlot = slotParam === 'short-2' ? 'short-2' : 'short-1';
      const result = await jobScheduler.triggerSlot(validSlot, category);

      const status = result.accepted ? 202 : 200;
      res.status(status).json({
        success: result.accepted,
        slot: validSlot,
        ...result,
      });
    } catch (err: any) {
      logger.error(`Error in generic cron trigger: ${err.message}`);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}

export const cronController = new CronController();
