import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgresql://ai_shorts_user:oCNgtShUZoZXS8fyVrDEVumHtsNQKvNq@dpg-davus9e7bikc73fi03ug-a.oregon-postgres.render.com:5432/ai_shorts_db_91zp?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function inspect() {
  try {
    const users = await prisma.user.findMany();
    console.log('User count in DB:', users.length);
    for (const u of users) {
      console.log(`User: id=${u.id}, username="${u.username}", createdAt=${u.createdAt}`);
    }

    const settings = await prisma.setting.findMany();
    console.log('\nSettings count in DB:', settings.length);
    for (const s of settings) {
      console.log(`Setting: ${s.key} = ${s.value.slice(0, 30)}...`);
    }

    // Check if session table exists
    try {
      const sessions: any = await prisma.$queryRawUnsafe('SELECT * FROM "session" LIMIT 5;');
      console.log('\nSessions in DB:', sessions);
    } catch (err: any) {
      console.log('\nSession table query error:', err.message);
    }
  } catch (err: any) {
    console.error('Inspect error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
