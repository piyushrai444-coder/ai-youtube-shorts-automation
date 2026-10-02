import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { cronRouter } from './cronRoutes.js';
import { authRouter } from './authRoutes.js';
import { youtubeRouter } from './youtubeRoutes.js';
import { adminRouter } from './adminRoutes.js';

export const mainRouter = Router();

// Mount sub-routers
mainRouter.use(healthRouter);
mainRouter.use(cronRouter);
mainRouter.use(authRouter);
mainRouter.use(youtubeRouter);
mainRouter.use(adminRouter);

// Root redirect
mainRouter.get('/', (req, res) => {
  res.redirect('/admin');
});
