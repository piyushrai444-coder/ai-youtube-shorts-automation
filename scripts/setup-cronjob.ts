import axios from 'axios';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config/index.js';

interface CronJobSetupParams {
  cronJobApiKey: string;
  appUrl: string;
  cronSecret: string;
}

export async function createCronJobs(params: CronJobSetupParams): Promise<void> {
  const { cronJobApiKey, appUrl, cronSecret } = params;
  const baseUrl = 'https://api.cron-job.org/jobs';

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${cronJobApiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  const jobsToCreate = [
    {
      title: 'AI Short 1 - Morning (10:00 AM IST)',
      url: `${appUrl}/api/cron/generate-short-1`,
      hour: 10,
      minute: 0,
    },
    {
      title: 'AI Short 2 - Evening (07:00 PM IST)',
      url: `${appUrl}/api/cron/generate-short-2`,
      hour: 19,
      minute: 0,
    },
  ];

  for (const job of jobsToCreate) {
    logger.info(`Creating cron job: "${job.title}" -> ${job.url}...`);
    try {
      const payload = {
        job: {
          url: job.url,
          enabled: true,
          title: job.title,
          saveResponses: true,
          schedule: {
            timezone: 'Asia/Kolkata',
            hours: [job.hour],
            minutes: [job.minute],
            mdays: [-1],
            months: [-1],
            wdays: [-1],
          },
          requestMethod: 1, // POST
          extendedData: {
            headers: {
              Authorization: `Bearer ${cronSecret}`,
            },
          },
        },
      };

      const res = await client.put('', payload);
      logger.info(`✅ Successfully created cron job: ${job.title} (Job ID: ${res.data?.jobId || 'OK'})`);
    } catch (err: any) {
      logger.error(`Failed to create cron job "${job.title}": ${err?.response?.data?.message || err.message}`);
    }
  }
}

// Allow CLI execution: tsx scripts/setup-cronjob.ts <CRON_JOB_API_KEY> <APP_URL> <CRON_SECRET>
if (process.argv[2]) {
  const apiKey = process.argv[2];
  const url = process.argv[3] || config.appUrl;
  const secret = process.argv[4] || config.cron.secret;
  createCronJobs({ cronJobApiKey: apiKey, appUrl: url, cronSecret: secret }).then(() => {
    logger.info('Cron-job setup completed.');
  });
}
