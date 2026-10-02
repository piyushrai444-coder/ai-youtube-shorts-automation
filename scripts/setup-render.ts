import axios from 'axios';
import { logger } from '../src/utils/logger.js';

interface RenderSetupParams {
  renderApiKey: string;
  repoUrl?: string;
}

export async function createRenderResources(params: RenderSetupParams): Promise<void> {
  const { renderApiKey, repoUrl = 'https://github.com/piyushrai444-coder/ai-youtube-shorts-automation' } = params;
  const client = axios.create({
    baseURL: 'https://api.render.com/v1',
    headers: {
      Authorization: `Bearer ${renderApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  });

  try {
    // 1. Get Owner ID
    logger.info('Fetching Render account owner...');
    const ownersRes = await client.get('/owners');
    const owner = ownersRes.data?.[0]?.owner;
    if (!owner || !owner.id) {
      throw new Error('No owner account found on Render.');
    }
    logger.info(`Found Render account: ${owner.name || owner.email} (ID: ${owner.id})`);

    // 2. Create PostgreSQL Database
    logger.info('Creating Render PostgreSQL database: "ai-shorts-db"...');
    let dbConnectionString = '';
    try {
      const dbRes = await client.post('/postgres', {
        name: 'ai-shorts-db',
        databaseName: 'ai_shorts_db',
        databaseUser: 'ai_shorts_user',
        plan: 'free',
        ownerId: owner.id,
      });
      logger.info(`✅ PostgreSQL Database created: ${dbRes.data?.id}`);
      dbConnectionString = dbRes.data?.connectionInfo?.internalConnectionString || '';
    } catch (err: any) {
      logger.warn(`Database creation note: ${err?.response?.data?.message || err.message}`);
    }

    // 3. Create Web Service
    logger.info(`Deploying Web Service from repository ${repoUrl}...`);
    const serviceRes = await client.post('/services', {
      type: 'web_service',
      name: 'ai-youtube-shorts',
      ownerId: owner.id,
      repo: repoUrl,
      branch: 'main',
      env: 'docker',
      plan: 'free',
      autoDeploy: 'yes',
      healthCheckPath: '/health',
      serviceDetails: {
        env: 'docker',
        plan: 'free',
      },
    });

    const serviceId = serviceRes.data?.service?.id || serviceRes.data?.id;
    const serviceUrl = serviceRes.data?.service?.serviceDetails?.url || serviceRes.data?.serviceDetails?.url || '';

    logger.info(`🎉 Service successfully created on Render!`);
    logger.info(`Service ID: ${serviceId}`);
    if (serviceUrl) {
      logger.info(`Live URL: ${serviceUrl}`);
    }
  } catch (err: any) {
    logger.error(`Render setup error: ${err?.response?.data?.message || err.message}`);
    if (err?.response?.data) {
      logger.error('API response details:', err.response.data);
    }
  }
}

// Allow CLI execution: tsx scripts/setup-render.ts <RENDER_API_KEY>
if (process.argv[2]) {
  createRenderResources({ renderApiKey: process.argv[2] });
}
