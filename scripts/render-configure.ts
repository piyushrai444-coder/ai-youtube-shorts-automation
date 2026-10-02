import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../src/utils/logger.js';

const RENDER_API_KEY = 'rnd_CPDBcyKxuDEn1rd2FCO7CwPmmeas';
const SERVICE_ID = 'srv-davus4m0tbcc73fgg240';
const OWNER_ID = 'tea-davub3hsrm7s73ddomu0';
const APP_URL = 'https://ai-youtube-shorts.onrender.com';

const client = axios.create({
  baseURL: 'https://api.render.com/v1',
  headers: {
    Authorization: `Bearer ${RENDER_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

async function run() {
  logger.info('Creating PostgreSQL database with version 16 on Render...');

  let internalDbUrl = '';
  try {
    const dbRes = await client.post('/postgres', {
      name: 'ai-shorts-db',
      databaseName: 'ai_shorts_db',
      databaseUser: 'ai_shorts_user',
      plan: 'free',
      version: '16',
      ownerId: OWNER_ID,
    });
    const db = dbRes.data;
    logger.info(`✅ PostgreSQL Database created: ${db.id}`);

    // Fetch database connection info
    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      await new Promise((r) => setTimeout(r, 3000));
      const infoRes = await client.get(`/postgres/${db.id}/connection-info`);
      if (infoRes.data?.internalConnectionString) {
        internalDbUrl = infoRes.data.internalConnectionString;
        logger.info('Got PostgreSQL internal connection string.');
        break;
      }
    }
  } catch (err: any) {
    logger.warn(`Database creation message: ${err?.response?.data?.message || err.message}`);
    // If database already exists, find it
    const listRes = await client.get(`/postgres?ownerId=${OWNER_ID}`);
    const existing = listRes.data?.[0]?.postgres;
    if (existing) {
      logger.info(`Using existing PostgreSQL database: ${existing.id}`);
      const infoRes = await client.get(`/postgres/${existing.id}/connection-info`);
      internalDbUrl = infoRes.data?.internalConnectionString || '';
    }
  }

  // Generate strong random secrets
  const cronSecret = 'yt_cron_' + crypto.randomBytes(16).toString('hex');
  const sessionSecret = 'yt_sess_' + crypto.randomBytes(24).toString('hex');

  logger.info(`Setting environment variables on Web Service ${SERVICE_ID}...`);
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '3000' },
    { key: 'APP_URL', value: APP_URL },
    { key: 'SESSION_SECRET', value: sessionSecret },
    { key: 'CRON_SECRET', value: cronSecret },
    { key: 'TIMEZONE', value: 'Asia/Kolkata' },
    { key: 'DAILY_SHORT_COUNT', value: '2' },
    { key: 'SHORT_1_TIME', value: '10:00' },
    { key: 'SHORT_2_TIME', value: '19:00' },
    { key: 'LLM_PROVIDER', value: 'gemini' },
    { key: 'LLM_MODEL', value: 'gemini-1.5-flash' },
    { key: 'RESEARCH_PROVIDER', value: 'rss' },
    { key: 'TTS_PROVIDER', value: 'openai' },
    { key: 'TTS_VOICE', value: 'alloy' },
    { key: 'STORAGE_PROVIDER', value: 'local' },
    { key: 'CHANNEL_NAME', value: 'AI Daily Radar' },
    { key: 'WATERMARK_TEXT', value: '@AIDailyRadar' },
    { key: 'DEFAULT_CTA', value: 'Follow for daily breakthrough AI tools 🚀' },
    { key: 'GOOGLE_REDIRECT_URI', value: `${APP_URL}/admin/youtube/callback` },
  ];

  if (internalDbUrl) {
    envVars.push({ key: 'DATABASE_URL', value: internalDbUrl });
  }

  // Set environment variables using Render PUT /services/{id}/env-vars
  await client.put(`/services/${SERVICE_ID}/env-vars`, envVars);
  logger.info(`✅ Environment variables configured on Render!`);

  // Trigger a deploy to pick up env vars
  logger.info('Triggering a fresh deployment...');
  const deployRes = await client.post(`/services/${SERVICE_ID}/deploys`);
  logger.info(`🚀 Deploy triggered! Deploy ID: ${deployRes.data?.id}`);
  logger.info('----------------------------------------------------');
  logger.info(`Live App URL: ${APP_URL}`);
  logger.info(`CRON_SECRET generated: ${cronSecret}`);
  logger.info('----------------------------------------------------');
}

run().catch((err) => {
  logger.error(`Render configure error: ${err?.response?.data?.message || err.message}`);
  if (err?.response?.data) {
    console.error(err.response.data);
  }
  process.exit(1);
});
