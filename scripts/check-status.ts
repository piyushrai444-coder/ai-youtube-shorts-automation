import axios from 'axios';

const RENDER_API_KEY = 'rnd_CPDBcyKxuDEn1rd2FCO7CwPmmeas';
const SERVICE_ID = 'srv-davus4m0tbcc73fgg240';
const APP_URL = 'https://ai-youtube-shorts.onrender.com';

const client = axios.create({
  baseURL: 'https://api.render.com/v1',
  headers: {
    Authorization: `Bearer ${RENDER_API_KEY}`,
    Accept: 'application/json',
  },
  timeout: 10000,
});

async function check() {
  console.log('--- Checking Render Service ---');
  try {
    const srvRes = await client.get(`/services/${SERVICE_ID}`);
    console.log('Service Name:', srvRes.data?.service?.name);
    console.log('Service Suspended:', srvRes.data?.service?.suspended);
    console.log('Service State:', srvRes.data?.service?.serviceDetails?.state || srvRes.data?.service?.serviceDetails);
  } catch (err: any) {
    console.log('Service fetch error:', err.message);
  }

  console.log('\n--- Checking Recent Deploys ---');
  try {
    const deploysRes = await client.get(`/services/${SERVICE_ID}/deploys?limit=3`);
    for (const d of deploysRes.data || []) {
      console.log(`Deploy ${d.deploy.id}: status=${d.deploy.status}, trigger=${d.deploy.trigger}, createdAt=${d.deploy.createdAt}`);
    }
  } catch (err: any) {
    console.log('Deploy fetch error:', err.message);
  }

  console.log('\n--- Checking Live Health Endpoint ---');
  try {
    const healthRes = await axios.get(`${APP_URL}/health`, { timeout: 10000 });
    console.log('Health status code:', healthRes.status);
    console.log('Health response:', JSON.stringify(healthRes.data, null, 2));
  } catch (err: any) {
    console.log('Health check failed:', err.response?.status, err.response?.data || err.message);
  }
}

check();
