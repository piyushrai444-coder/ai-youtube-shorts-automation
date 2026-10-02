import fs from 'fs';
import path from 'path';
import { videoService } from '../src/services/video/VideoService.js';
import { VideoValidator } from '../src/services/video/VideoValidator.js';
import { GeneratedScript } from '../src/types/index.js';
import { logger } from '../src/utils/logger.js';

async function testPipeline() {
  logger.info('--- Commencing Real End-to-End Video Render Verification ---');

  const testScript: GeneratedScript = {
    title: 'This AI Tool Can Build Websites in Minutes 🤯',
    hook: 'Did you know this new AI tool can build complete web applications from just one sentence?',
    explanation: 'Just describe what you want and the tool generates the complete responsive website with working database and APIs.',
    benefit: 'It can save hours of manual development work and helps you launch production apps instantly.',
    cta: 'Follow for daily breakthrough AI tools and updates 🚀',
    fullScript: 'Did you know this new AI tool can build complete web applications from just one sentence? Just describe what you want and the tool generates the complete responsive website with working database and APIs. It can save hours of manual development work and helps you launch production apps instantly. Follow for daily breakthrough AI tools and updates 🚀',
    estimatedDurationSeconds: 22.0,
    wordCount: 62,
    tags: ['AI', 'Tech', 'AITools', 'WebDev'],
    description: 'This AI Tool Can Build Websites in Minutes 🤯\n\nFollow for more daily AI breakthroughs!\n#AI #AITools #Shorts',
    category: 'AI Tools',
  };

  const videoPackage = await videoService.produceShortVideo(testScript, 'test-job-001');

  logger.info(`Video Render Package output:`, {
    videoPath: videoPackage.videoPath,
    durationSeconds: videoPackage.durationSeconds,
    thumbnailPath: videoPackage.thumbnailPath,
    subtitlesPath: videoPackage.subtitlesPath,
  });

  const validation = await VideoValidator.validateShort(videoPackage.videoPath, 'test-job-001');
  logger.info('Validation Report:', validation);

  if (!validation.isValid) {
    throw new Error(`Rendered video failed validation: ${validation.error}`);
  }

  const stat = await fs.promises.stat(videoPackage.videoPath);
  logger.info(`SUCCESS! Rendered MP4 exists with size ${(stat.size / 1024).toFixed(1)} KB`);
  logger.info(`Resolution: ${validation.width}x${validation.height} (${validation.aspectRatio})`);
  logger.info(`Duration: ${validation.duration}s (≤ 30s limit compliant)`);
  logger.info(`Codecs: Video=${validation.videoCodec}, Audio=${validation.audioCodec}`);

  // Clean up
  await videoService.cleanupWorkDir(videoPackage.tempDir);
}

testPipeline().catch((err) => {
  console.error('Test pipeline failed:', err);
  process.exit(1);
});
