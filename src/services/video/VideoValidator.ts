import fs from 'fs';
import { ffmpegService } from './FFmpegService.js';
import { ValidationResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class VideoValidator {
  static async validateShort(filePath: string, jobId?: string): Promise<ValidationResult> {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, error: `File not found at path: ${filePath}` };
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      return { isValid: false, error: 'Video file size is 0 bytes' };
    }

    try {
      const meta = await ffmpegService.getMediaMetadata(filePath);
      const videoStream = meta.streams.find((s) => s.codec_type === 'video');
      const audioStream = meta.streams.find((s) => s.codec_type === 'audio');

      if (!videoStream) {
        return { isValid: false, error: 'File contains no video stream' };
      }

      const width = videoStream.width || 0;
      const height = videoStream.height || 0;
      const duration = Number(meta.format.duration || videoStream.duration || 0);
      const videoCodec = videoStream.codec_name || '';
      const audioCodec = audioStream?.codec_name || 'none';

      // 1. Duration check: Must be <= 30 seconds
      if (duration > 30.5) { // small 0.5s tolerance for audio tail padding
        return {
          isValid: false,
          width,
          height,
          duration,
          videoCodec,
          audioCodec,
          error: `Duration (${duration.toFixed(2)}s) exceeds YouTube Shorts strict limit of 30 seconds`,
        };
      }

      // 2. Aspect Ratio: Must be vertical (height > width, standard 9:16 is 1080x1920)
      if (height <= width) {
        return {
          isValid: false,
          width,
          height,
          duration,
          videoCodec,
          audioCodec,
          error: `Invalid aspect ratio: ${width}x${height}. Shorts requires vertical 9:16 video (height > width).`,
        };
      }

      // 3. Codec validation: H.264
      if (!videoCodec.includes('h264') && !videoCodec.includes('avc')) {
        return {
          isValid: false,
          width,
          height,
          duration,
          videoCodec,
          audioCodec,
          error: `Video codec is "${videoCodec}". YouTube requires H.264.`,
        };
      }

      logger.job(
        jobId || 'sys',
        `Video validation passed: ${width}x${height} (9:16), ${duration.toFixed(2)}s, codec: ${videoCodec}/${audioCodec}`
      );

      return {
        isValid: true,
        width,
        height,
        duration,
        videoCodec,
        audioCodec,
        aspectRatio: '9:16',
      };
    } catch (err: any) {
      return { isValid: false, error: `Failed to inspect video metadata: ${err.message}` };
    }
  }
}
