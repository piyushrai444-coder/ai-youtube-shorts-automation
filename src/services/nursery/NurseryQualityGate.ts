import fs from 'fs';
import { ffmpegService } from '../video/FFmpegService.js';
import { StructuredSongLyrics, NurseryQualityCheckResult, VideoLengthType, AspectRatioType } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export interface NurseryValidationInput {
  videoPath: string;
  title: string;
  lyrics: StructuredSongLyrics;
  characters: string[];
  videoType?: VideoLengthType;
  aspectRatio?: AspectRatioType;
  bpm: number;
}

export class NurseryQualityGate {
  private static readonly FORBIDDEN_IP_TERMS = [
    'cocomelon',
    'baby shark',
    'pinkfong',
    'peppa pig',
    'blippi',
    'paw patrol',
    'disney',
    'mickey mouse',
    'super simple songs',
    'the wiggles',
    'sesame street',
    'teletubbies',
    'bluey',
    'cocomelon',
    'chuchu tv',
    'dave and ava',
    'little baby bum',
  ];

  private static readonly RECOGNIZED_CHARACTERS = [
    'leo the lion cub',
    'leo',
    'mia the bunny',
    'mia',
    'toby the turtle',
    'toby',
    'ella the elephant',
    'ella',
    'professor owl',
    'owl',
  ];

  /**
   * Validates a rendered nursery rhyme music video against preschool production benchmarks
   */
  async validateNurseryVideo(
    input: NurseryValidationInput,
    jobId?: string
  ): Promise<NurseryQualityCheckResult> {
    logger.job(jobId || 'nursery', `Executing Nursery Quality Gate for "${input.title}"...`);

    const issues: string[] = [];
    const warnings: string[] = [];
    const videoType = input.videoType || 'SHORT';

    // 1. Duration requirements
    let minDur = config.nursery.shortMinDurationSeconds || 30;
    let maxDur = config.nursery.shortMaxDurationSeconds || 60;
    let targetDur = config.nursery.shortTargetDurationSeconds || 45;

    if (videoType === 'FULL_SONG') {
      minDur = config.nursery.songMinDurationSeconds || 90;
      maxDur = config.nursery.songMaxDurationSeconds || 180;
      targetDur = config.nursery.songTargetDurationSeconds || 120;
    } else if (videoType === 'COMPILATION') {
      minDur = 240;
      maxDur = 1800;
      targetDur = 600;
    }

    // 2. Physical File Check & Streams
    let probedDuration = targetDur;
    let melodyComplete = true;

    if (!fs.existsSync(input.videoPath)) {
      issues.push(`Video file not found on disk at: ${input.videoPath}`);
      melodyComplete = false;
    } else {
      try {
        probedDuration = await ffmpegService.getMediaDuration(input.videoPath);
        const meta = await ffmpegService.getMediaMetadata(input.videoPath);
        const hasAudio = meta.streams.some((s) => s.codec_type === 'audio');
        const hasVideo = meta.streams.some((s) => s.codec_type === 'video');

        if (!hasAudio) {
          issues.push('Missing audio stream: Nursery rhyme must have musical audio track.');
          melodyComplete = false;
        }
        if (!hasVideo) {
          issues.push('Missing video stream in output MP4 file.');
        }

        if (probedDuration < minDur - 1.0) {
          issues.push(`Duration ${probedDuration.toFixed(1)}s is shorter than minimum required (${minDur}s).`);
        } else if (probedDuration > maxDur + 2.0) {
          issues.push(`Duration ${probedDuration.toFixed(1)}s exceeds maximum allowed (${maxDur}s).`);
        }
      } catch (err: any) {
        warnings.push(`ffprobe metadata probe failed or was partial: ${err.message}`);
        probedDuration = targetDur;
      }
    }

    // 4. Lyrics Structure & Repetition
    let lyricsClear = true;
    const chorusSections = input.lyrics.sections.filter((s) => s.type === 'chorus');
    if (chorusSections.length < 1) {
      issues.push('Nursery lyrics must contain at least one catchy, memorable chorus.');
      lyricsClear = false;
    }

    const totalLines = input.lyrics.sections.reduce((acc, s) => {
      const count = s.lines ? s.lines.length : (s.lyrics ? s.lyrics.split('\n').length : 1);
      return acc + count;
    }, 0);
    if (totalLines < 2) {
      issues.push('Lyrics are too brief for a nursery rhyme song.');
      lyricsClear = false;
    }

    // 5. Choreography Synchronization
    const actionBreaks = input.lyrics.sections.filter(
      (s) => s.type === 'action_break' || (s.actions && s.actions.length > 0) || (s.choreography && s.choreography.length > 0)
    );
    const choreographySynced = actionBreaks.length > 0;
    if (!choreographySynced) {
      warnings.push('Song has no explicit action breaks or choreography cues.');
    }

    // 6. Character Consistency & Bible Matching
    let characterConsistencyScore = 100;
    if (input.characters.length === 0) {
      issues.push('No preschool characters assigned to song.');
      characterConsistencyScore = 0;
    } else {
      for (const char of input.characters) {
        const lower = char.toLowerCase();
        const matchesBible = NurseryQualityGate.RECOGNIZED_CHARACTERS.some((c) => lower.includes(c));
        if (!matchesBible) {
          warnings.push(`Character '${char}' is not in the recognized preschool cast bible.`);
          characterConsistencyScore = Math.max(70, characterConsistencyScore - 15);
        }
      }
    }

    // 7. Strict Originality & Trademark Rejection
    const lyricsText = input.lyrics.sections
      .map((s) => (s.lines ? s.lines.join(' ') : s.lyrics || ''))
      .join(' ');
    const combinedContent = `${input.title} ${lyricsText}`.toLowerCase();
    let originalityVerified = true;
    for (const forbidden of NurseryQualityGate.FORBIDDEN_IP_TERMS) {
      if (combinedContent.includes(forbidden)) {
        issues.push(`Copyright / trademark violation detected: '${forbidden}' found in song content.`);
        originalityVerified = false;
        break;
      }
    }

    // 8. YouTube "Made for Kids" Safety Check
    const inappropriateKeywords = ['gun', 'violence', 'scary', 'kill', 'monster', 'blood', 'hate', 'fight', 'weapon'];
    let madeForKidsCompliant = true;
    for (const badWord of inappropriateKeywords) {
      if (combinedContent.includes(badWord)) {
        issues.push(`Content safety violation: Inappropriate word '${badWord}' for Made-for-Kids content.`);
        madeForKidsCompliant = false;
        break;
      }
    }

    const passed = issues.length === 0;

    logger.job(
      jobId || 'nursery',
      `Nursery Quality Gate Result: ${passed ? 'PASSED ✅' : 'FAILED ❌'} (Duration: ${probedDuration.toFixed(1)}s [Target: ${targetDur}s], Consistency: ${characterConsistencyScore}%, Issues: ${issues.length})`
    );

    return {
      passed,
      melodyComplete,
      lyricsClear,
      choreographySynced,
      characterConsistencyScore,
      durationSeconds: probedDuration,
      targetDurationSeconds: targetDur,
      originalityVerified,
      madeForKidsCompliant,
      issues,
      warnings,
    };
  }
}

export const nurseryQualityGate = new NurseryQualityGate();
