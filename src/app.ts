import express from 'express';
import path from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import { config } from './config/index.js';
import { mainRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

export function createApp(): express.Application {
  const app = express();

  // CRITICAL: Trust reverse proxy on Render / Cloudflare so req.secure and IP detection work
  app.set('trust proxy', 1);

  // Security Headers (configured to allow inline Tailwind CDN, video playback, and images)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          mediaSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cors());
  app.use(cookieParser());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static Assets
  app.use(express.static(path.resolve(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Session Store Setup (Use connect-pg-simple with Prisma-managed session table)
  let sessionStore: session.Store | undefined;
  if (config.database.url && !config.database.url.includes('localhost') && process.env.NODE_ENV === 'production') {
    try {
      const PgStore = pgSession(session);
      const pgPool = new pg.Pool({ connectionString: config.database.url });
      pgPool.on('error', (err) => {
        logger.error(`Session pgPool error: ${err.message}`);
      });
      sessionStore = new PgStore({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: false, // Session table is already managed by Prisma
      });
      logger.info('PostgreSQL session store initialized');
    } catch (err: any) {
      logger.warn(`Could not connect session to PostgreSQL: ${err.message}. Using memory store.`);
    }
  }

  app.use(
    session({
      store: sessionStore,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      proxy: true,
      name: 'ai_shorts_sid',
      cookie: {
        httpOnly: true,
        secure: 'auto',
        sameSite: 'lax',
        maxAge: config.session.maxAgeDays * 24 * 60 * 60 * 1000,
      },
    })
  );

  // EJS View Engine Configuration
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(process.cwd(), 'src/views'));

  // Global template variables
  app.use((req, res, next) => {
    res.locals.appUrl = config.appUrl;
    res.locals.channelName = config.branding.channelName;
    res.locals.currentPath = req.path;
    res.locals.currentUser = req.session?.userId ? { id: req.session.userId, username: req.session.username } : null;
    next();
  });

  // Mount Application Routes
  app.use(mainRouter);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
