import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { songRepository } from '../../repositories/SongRepository.js';
import { ffmpegService } from '../video/FFmpegService.js';
import { logger } from '../../utils/logger.js';
import { Song, Compilation } from '@prisma/client';

export interface CompilationBuildOptions {
  title?: string;
  description?: string;
  songIds?: string[];
  maxSongs?: number;
  targetDurationMinutes?: number;
  aspectRatio?: '16:9' | '9:16';
  jobId?: string;
}

export interface CompilationResult {
  compilationId: string;
  title: string;
  description: string;
  videoPath: string;
  totalDurationSeconds: number;
  songCount: number;
  chapters: { title: string; timestamp: string; seconds: number }[];
}

export class CompilationService {
  /**
   * Helper to format seconds as MM:SS or HH:MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Select songs for a compilation.
   * Prefers songs that have video files or are marked PRODUCED/UPLOADED.
   */
  async selectSongsForCompilation(options: CompilationBuildOptions): Promise<Song[]> {
    if (options.songIds && options.songIds.length > 0) {
      const selected: Song[] = [];
      for (const id of options.songIds) {
        const s = await songRepository.findById(id);
        if (s) selected.push(s);
      }
      return selected;
    }

    const max = options.maxSongs || 5;
    const allSongs = await songRepository.findAll(50, 'nursery_rhymes');
    const eligible = allSongs.filter(
      (s) => (s.status === 'PRODUCED' || s.status === 'UPLOADED' || s.status === 'APPROVED') && s.videoUrl
    );

    if (eligible.length > 0) {
      return eligible.slice(0, max);
    }

    // Fallback to top approved songs even without uploaded URL for testing/mocking
    return allSongs.slice(0, max);
  }

  /**
   * Stitches multiple nursery rhyme video files into a seamless compilation with chapter markers.
   */
  async buildCompilation(options: CompilationBuildOptions): Promise<CompilationResult> {
    const { jobId } = options;
    logger.job(jobId || 'sys', 'Starting Nursery Compilation build...');

    const songs = await this.selectSongsForCompilation(options);
    if (songs.length === 0) {
      throw new Error('No eligible nursery rhyme songs found to build a compilation');
    }

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nursery_compilation_'));
    const outputVideoPath = path.join(tempDir, `compilation_${Date.now()}.mp4`);

    try {
      // 1. Gather valid video paths or synthesize if testing
      const songVideoEntries: { song: Song; videoPath: string; duration: number }[] = [];
      let currentRunningTime = 0;
      const chapters: { title: string; timestamp: string; seconds: number }[] = [];

      for (const song of songs) {
        let videoFile = song.videoUrl;
        let duration = song.durationSeconds || 60;

        // If videoUrl is a local file or exists
        if (videoFile && fs.existsSync(videoFile)) {
          const probed = await ffmpegService.getMediaDuration(videoFile);
          if (probed > 0) duration = probed;
        } else {
          // If no local video file exists, synthesize a lightweight placeholder video for the song
          videoFile = path.join(tempDir, `placeholder_song_${song.id}.mp4`);
          await this.generatePlaceholderSongVideo(song, duration, videoFile);
        }

        chapters.push({
          title: song.title,
          timestamp: this.formatTimestamp(currentRunningTime),
          seconds: currentRunningTime,
        });

        currentRunningTime += duration;
        songVideoEntries.push({ song, videoPath: videoFile, duration });
      }

      // 2. Build FFmpeg concat list
      const concatListPath = path.join(tempDir, 'concat_list.txt');
      let concatText = '';
      for (const entry of songVideoEntries) {
        concatText += `file '${entry.videoPath.replace(/'/g, "'\\''")}'\n`;
      }
      await fs.promises.writeFile(concatListPath, concatText);

      // 3. Render concatenated video
      logger.job(jobId || 'sys', `Concatenating ${songVideoEntries.length} songs into a single video (${currentRunningTime.toFixed(1)}s)...`);
      await this.stitchVideosWithFFmpeg(concatListPath, outputVideoPath);

      // 4. Generate YouTube friendly description with timestamps
      const title =
        options.title ||
        `${songs[0].title} & More Kids Songs | Non-Stop Preschool Nursery Rhymes (${Math.round(currentRunningTime / 60)} Mins)`;

      let description =
        options.description ||
        `Sing, dance, and learn with Leo, Mia, Toby, Ella, and Professor Owl! Enjoy our cheerful collection of original preschool songs and nursery rhymes for toddlers.\n\n`;

      description += `🎵 SONG TIMESTAMPS / CHAPTERS:\n`;
      for (const ch of chapters) {
        description += `${ch.timestamp} - ${ch.title}\n`;
      }
      description += `\n🌟 Original preschool learning songs featuring character choreography and sing-along karaoke subtitles.\n#NurseryRhymes #KidsSongs #Preschool #SingAlong #ToddlerLearning\n`;

      // 5. Save compilation record to database
      let compilationRecord: Compilation | null = null;
      try {
        compilationRecord = await songRepository.createCompilation({
          title,
          description,
          totalDuration: Math.round(currentRunningTime),
          songIds: songs.map((s) => s.id),
        });
      } catch (err: any) {
        logger.warn(`Could not save compilation to DB (continuing): ${err.message}`);
      }

      return {
        compilationId: compilationRecord ? compilationRecord.id : `mock_${Date.now()}`,
        title,
        description,
        videoPath: outputVideoPath,
        totalDurationSeconds: currentRunningTime,
        songCount: songs.length,
        chapters,
      };
    } catch (err: any) {
      logger.error(`Compilation build failed: ${err.message}`, undefined, jobId);
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw err;
    }
  }

  /**
   * Concat videos using FFmpeg
   */
  private stitchVideosWithFFmpeg(concatListPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('start', (cmd) => logger.debug(`FFmpeg concat command: ${cmd}`))
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Generates a brief solid color or placeholder video for testing when source MP4 is absent.
   */
  private generatePlaceholderSongVideo(song: Song, duration: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=c=0x1E3A8A:s=1080x1920:r=30')
        .inputFormat('lavfi')
        .input('anullsrc=r=44100:cl=stereo')
        .inputFormat('lavfi')
        .outputOptions([
          '-t', Math.min(duration, 5).toFixed(1), // clamp to 5s if testing
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }
}

export const compilationService = new CompilationService();
