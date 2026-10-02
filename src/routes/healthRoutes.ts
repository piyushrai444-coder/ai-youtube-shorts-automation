import { Router } from 'express';
import { healthController } from '../controllers/HealthController.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => healthController.check(req, res));
