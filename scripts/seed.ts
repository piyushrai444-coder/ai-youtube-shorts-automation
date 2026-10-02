import bcrypt from 'bcrypt';
import { prisma } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function seed() {
  logger.info('Starting database seed...');

  // 1. Seed Admin User
  const existingUser = await prisma.user.findFirst();
  if (!existingUser) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const user = await prisma.user.create({
      data: {
        username: process.env.ADMIN_USERNAME || 'admin',
        passwordHash,
      },
    });
    logger.info(`Created default admin user: ${user.username} (Password: ${defaultPassword})`);
  } else {
    logger.info(`Admin user already exists: ${existingUser.username}`);
  }

  // 2. Seed Default Settings
  const defaultSettings = [
    { key: 'channel_name', value: 'AI Daily Radar' },
    { key: 'watermark_text', value: '@AIDailyRadar' },
    { key: 'default_cta', value: 'Follow for daily breakthrough AI tools 🚀' },
    { key: 'short_1_time', value: '10:00' },
    { key: 'short_2_time', value: '19:00' },
    { key: 'llm_provider', value: 'gemini' },
    { key: 'llm_model', value: 'gemini-1.5-flash' },
    { key: 'tts_voice', value: 'alloy' },
    { key: 'enable_background_music', value: 'false' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  logger.info('Database seeded successfully.');
  process.exit(0);
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
