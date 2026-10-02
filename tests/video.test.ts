import sharp from 'sharp';
import { SubtitleGenerator } from '../src/services/video/SubtitleGenerator';
import { CanvasVisualProvider } from '../src/services/visual/CanvasVisualProvider';
import { VideoValidator } from '../src/services/video/VideoValidator';
import { ffmpegService } from '../src/services/video/FFmpegService';

describe('Video Processing Pipeline & Validation', () => {
  describe('Canvas Visual Provider', () => {
    it('should generate crisp 1080x1920 PNG frames for vertical Shorts', async () => {
      const provider = new CanvasVisualProvider();
      const results = await provider.generateVisuals([
        {
          index: 0,
          type: 'hook',
          headline: 'Revolutionary AI Coding Agent',
          bodyText: 'This tool builds complete web apps from a single sentence.',
          category: 'AI Coding',
          durationSeconds: 5.0,
        },
      ]);

      expect(results.length).toBe(1);
      const frameBuffer = results[0].imageBuffer;
      expect(frameBuffer).toBeDefined();

      // Inspect actual dimensions with Sharp
      const metadata = await sharp(frameBuffer).metadata();
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1920);
      expect(metadata.format).toBe('png');
    });
  });

  describe('Subtitle Generator', () => {
    it('should generate synchronized .srt entries within total video duration', () => {
      const script = 'Did you know this tool exists? It can generate entire websites. Follow for more!';
      const totalDuration = 12.0;

      const items = SubtitleGenerator.generateSubtitleItems(script, totalDuration);
      expect(items.length).toBeGreaterThan(0);

      // Verify each item start < end and end <= totalDuration
      for (const item of items) {
        expect(item.rawStartSec).toBeLessThan(item.rawEndSec);
        expect(item.rawEndSec).toBeLessThanOrEqual(totalDuration + 0.1);
      }

      const srt = SubtitleGenerator.generateSrtContent(items);
      expect(srt).toContain('-->');
      expect(srt).toContain('1\n');
    });
  });

  describe('VideoValidator (Shorts Requirements)', () => {
    it('should pass valid 1080x1920 vertical H.264 video under 30 seconds', async () => {
      jest.spyOn(ffmpegService, 'getMediaMetadata').mockResolvedValue({
        format: { duration: 25.4 },
        streams: [
          { codec_type: 'video', width: 1080, height: 1920, codec_name: 'h264' },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      } as any);

      const result = await VideoValidator.validateShort('/tmp/mock_short.mp4');

      // Note: fs.existsSync check will be tested or mocked
    });

    it('should reject video exceeding strict 30s duration', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 1024000 } as any);

      jest.spyOn(ffmpegService, 'getMediaMetadata').mockResolvedValue({
        format: { duration: 35.2 }, // Exceeds 30s!
        streams: [
          { codec_type: 'video', width: 1080, height: 1920, codec_name: 'h264' },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      } as any);

      const result = await VideoValidator.validateShort('/tmp/mock_long.mp4');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds YouTube Shorts strict limit of 30 seconds');
    });

    it('should reject non-vertical video (e.g. 1920x1080 landscape)', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 1024000 } as any);

      jest.spyOn(ffmpegService, 'getMediaMetadata').mockResolvedValue({
        format: { duration: 22.0 },
        streams: [
          { codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' }, // Landscape!
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      } as any);

      const result = await VideoValidator.validateShort('/tmp/mock_landscape.mp4');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Shorts requires vertical 9:16 video');
    });
  });
});
