import { createApp } from './app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './config/database.js';
import { jobRecoveryService } from './jobs/JobRecoveryService.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info(`Starting AI YouTube Shorts Automation Platform in ${config.env} mode...`);

  // 1. Check Database
  const dbHealth = await checkDatabaseConnection();
  if (dbHealth.ok) {
    logger.info('Database connected successfully.');
  } else {
    logger.warn(`Database connection warning: ${dbHealth.error}`);
  }

  // 2. Start Job Recovery Service
  await jobRecoveryService.start();

  // 3. Start HTTP Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port} (${config.appUrl})`);
    logger.info(`Admin Portal: ${config.appUrl}/admin`);
    logger.info(`Health Endpoint: ${config.appUrl}/health`);
    logger.info(`Cron Endpoint 1: ${config.appUrl}/api/cron/generate-short-1 (${config.cron.short1Time} ${config.cron.timezone})`);
    logger.info(`Cron Endpoint 2: ${config.appUrl}/api/cron/generate-short-2 (${config.cron.short2Time} ${config.cron.timezone})`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    jobRecoveryService.stop();
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error(`Fatal bootstrap error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
