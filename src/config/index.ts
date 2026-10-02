import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/yt_shorts_db?schema=public',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'yt-shorts-super-secret-session-key-change-in-production',
    maxAgeDays: 7,
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  },

  cron: {
    secret: process.env.CRON_SECRET || 'yt-cron-secret-token-must-be-configured',
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    dailyShortCount: parseInt(process.env.DAILY_SHORT_COUNT || '2', 10),
    short1Time: process.env.SHORT_1_TIME || '10:00',
    short2Time: process.env.SHORT_2_TIME || '19:00',
  },

  llm: {
    provider: (process.env.LLM_PROVIDER || 'gemini').toLowerCase(),
    apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.LLM_MODEL || 'gemini-3.8-flash',
  },

  research: {
    provider: (process.env.RESEARCH_PROVIDER || 'multi').toLowerCase(),
    searchApiKey: process.env.SEARCH_API_KEY || '',
    maxResults: 15,
    freshnessDays: 5,
  },

  tts: {
    provider: (process.env.TTS_PROVIDER || 'openai').toLowerCase(),
    apiKey: process.env.TTS_API_KEY || process.env.OPENAI_API_KEY || '',
    voice: process.env.TTS_VOICE || 'alloy',
  },

  visual: {
    provider: (process.env.VISUAL_PROVIDER || 'canvas').toLowerCase(),
    apiKey: process.env.VISUAL_API_KEY || '',
  },

  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
    bucket: process.env.STORAGE_BUCKET || 'yt-shorts-bucket',
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || '',
    accessKey: process.env.STORAGE_ACCESS_KEY || '',
    secretKey: process.env.STORAGE_SECRET_KEY || '',
    localUploadDir: path.resolve(process.cwd(), 'uploads'),
  },

  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/admin/youtube/callback`,
    privacyStatus: (process.env.YOUTUBE_PRIVACY_STATUS || 'public') as 'public' | 'private' | 'unlisted',
  },

  branding: {
    channelName: process.env.CHANNEL_NAME || 'AI Daily Radar',
    watermarkText: process.env.WATERMARK_TEXT || '@AIDailyRadar',
    defaultCta: process.env.DEFAULT_CTA || 'Follow for daily breakthrough AI tools 🚀',
    enableBackgroundMusic: process.env.ENABLE_BACKGROUND_MUSIC === 'true',
  },

  ffmpeg: {
    ffmpegPath: process.env.FFMPEG_PATH || '',
    ffprobePath: process.env.FFPROBE_PATH || '',
  },
};
