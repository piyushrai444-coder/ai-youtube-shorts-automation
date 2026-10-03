import fs from 'fs';
import path from 'path';
import os from 'os';
import { ShortStatus, JobStatus } from '@prisma/client';
import { nurseryResearchService } from '../services/nursery/NurseryResearchService.js';
import { lyricGenerator } from '../services/nursery/LyricGenerator.js';
import { musicProvider } from '../services/nursery/MusicProvider.js';
import { singingProvider } from '../services/nursery/SingingProvider.js';
import { karaokeSubtitleService } from '../services/nursery/KaraokeSubtitleService.js';
import { nurseryVisualService } from '../services/nursery/NurseryVisualService.js';
import { nurseryQualityGate } from '../services/nursery/NurseryQualityGate.js';
import { kidsCharacterManager } from '../services/nursery/KidsCharacterManager.js';
import { environmentManager } from '../services/nursery/EnvironmentManager.js';
import { ffmpegService } from '../services/video/FFmpegService.js';
import { storageService } from '../services/storage/StorageService.js';
import { youtubeService } from '../services/youtube/YouTubeService.js';
import { shortRepository } from '../repositories/ShortRepository.js';
import { songRepository } from '../repositories/SongRepository.js';
import { jobRepository } from '../repositories/JobRepository.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { PipelineOptions } from './AutomationPipeline.js';
import { AspectRatioType, VideoLengthType } from '../types/index.js';

export interface NurseryPipelineOptions extends PipelineOptions {
  videoType?: VideoLengthType;
  aspectRatio?: AspectRatioType;
}

export class NurseryPipeline {
  async execute(options: NurseryPipelineOptions): Promise<void> {
    const { jobId, slotKey } = options;
    const videoType: VideoLengthType = options.videoType || 'SHORT';
    const aspectRatio: AspectRatioType = options.aspectRatio || '9:16';

    logger.job(jobId, `🧸 Starting Autonomous AI Nursery Rhymes & Kids Songs Pipeline for slot: ${slotKey}`);

    await jobRepository.update(jobId, {
      status: JobStatus.RUNNING,
      startedAt: new Date(),
    });

    let currentShortId = options.shortId;
    let workDir: string | null = null;
    let createdSongId: string | null = null;

    try {
      // 1. Fetch or initialize the Short record
      let shortRecord = currentShortId
        ? await shortRepository.findById(currentShortId)
        : await shortRepository.findBySlotKey(slotKey);

      if (!shortRecord) {
        shortRecord = await shortRepository.create({
          slotKey,
          title: 'Generating Nursery Rhyme...',
          script: '',
          description: '',
          category: 'Nursery Rhymes & Kids Songs',
          status: ShortStatus.RESEARCHING,
          scheduledAt: new Date(),
        });
      }
      currentShortId = shortRecord.id;
      await jobRepository.update(jobId, { shortId: currentShortId });

      await shortRepository.update(currentShortId, {
        contentMode: 'nursery_rhymes',
      });

      // Prepare temporary workspace for media rendering
      workDir = path.join(os.tmpdir(), `nursery_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
      await fs.promises.mkdir(workDir, { recursive: true });

      // 2. Step 1: Discover & Score Best Nursery Rhyme / Song Concept
      logger.job(jobId, 'Step 1/8: Researching preschool trends & scoring original song ideas...');
      await shortRepository.updateStatus(currentShortId, ShortStatus.RESEARCHING);
      const winningSongIdea = await nurseryResearchService.discoverBestSongIdea(jobId);

      // 3. Step 2: Structured Lyrics Generation
      logger.job(jobId, `Step 2/8: Composing structured preschool lyrics for "${winningSongIdea.title}"...`);
      await shortRepository.updateStatus(currentShortId, ShortStatus.SCRIPT_GENERATED);
      const lyrics = await lyricGenerator.generateLyrics(winningSongIdea, videoType, jobId);

      // Safe property fallbacks
      const songBpm = winningSongIdea.bpm || lyrics.bpm || 116;
      const songKey = winningSongIdea.musicalKey || lyrics.musicalKey || 'C Major';
      const songStyle = winningSongIdea.musicStyle || lyrics.musicStyle || 'Preschool Pop';
      const songEnv = winningSongIdea.environment || 'Rainbow Playground';
      const songDuration = winningSongIdea.targetDurationSeconds || 45;
      const songScore = winningSongIdea.totalScore ?? winningSongIdea.scores?.finalScore ?? 85;

      // Create Song entry in Database
      try {
        const songRecord = await songRepository.create({
          title: winningSongIdea.title,
          theme: winningSongIdea.theme,
          contentMode: 'nursery_rhymes',
          videoType,
          aspectRatio,
          targetAgeGroup: (winningSongIdea.targetAgeGroup || winningSongIdea.targetAge || '3-5') as string,
          learningObjective: winningSongIdea.educationalConcept || winningSongIdea.learningObjective,
          emotionalTone: winningSongIdea.emotionalTone || 'cheerful',
          bpm: songBpm,
          musicalKey: songKey,
          musicStyle: songStyle,
          lyricsStructured: lyrics,
          characters: winningSongIdea.characters,
          environmentName: songEnv,
          durationSeconds: songDuration,
          songScore: songScore,
          scoreBreakdown: winningSongIdea.scoreBreakdown || winningSongIdea.scores,
          status: 'PRODUCING',
        });
        createdSongId = songRecord.id;
      } catch (err: any) {
        logger.warn(`Could not save initial song record to DB: ${err.message}`);
      }

      // 4. Step 3: Musical Backing Track Synthesis
      logger.job(jobId, `Step 3/8: Synthesizing musical backing track (${songBpm} BPM, Key ${songKey})...`);
      const musicAsset = await musicProvider.generateMusicTrack(
        songKey,
        songBpm,
        songStyle,
        songDuration,
        jobId
      );
      const backingAudioPath = path.join(workDir, 'backing_track.wav');
      await fs.promises.writeFile(backingAudioPath, musicAsset.audioBuffer);

      // 5. Step 4: Character Melodic Singing Vocals & Karaoke Subtitles
      logger.job(jobId, 'Step 4/8: Performing character vocals and generating sing-along karaoke subtitles...');
      const vocals = await singingProvider.synthesizeSong(lyrics, winningSongIdea.characters, jobId);
      const vocalsAudioPath = path.join(workDir, 'vocals.mp3');
      await fs.promises.writeFile(vocalsAudioPath, vocals.audioBuffer);

      const totalAudioDuration = vocals.durationSeconds > 0 ? vocals.durationSeconds : songDuration;

      const subtitlesPath = path.join(workDir, 'karaoke_subtitles.srt');
      await karaokeSubtitleService.generateKaraokeSrt(lyrics, totalAudioDuration, subtitlesPath);

      // 6. Step 5: 3D Animated Puppet Visuals with Choreography & Lip-Sync
      logger.job(jobId, `Step 5/8: Generating 3D stylized character animation in ${songEnv} (${aspectRatio})...`);
      await shortRepository.updateStatus(currentShortId, ShortStatus.VIDEO_GENERATING);

      const visualScenes = await nurseryVisualService.generateSongVisuals(
        lyrics,
        winningSongIdea.characters,
        songEnv,
        totalAudioDuration,
        aspectRatio,
        jobId
      );

      const sceneImageFiles: { imagePath: string; duration: number }[] = [];
      for (const scene of visualScenes) {
        const sceneImgPath = path.join(workDir, `nursery_scene_${scene.sceneIndex}.png`);
        await fs.promises.writeFile(sceneImgPath, scene.imageBuffer);
        sceneImageFiles.push({
          imagePath: sceneImgPath,
          duration: scene.durationSeconds,
        });
      }

      // 7. Step 6: FFmpeg Video Assembly
      logger.job(jobId, `Step 6/8: Assembling video with FFmpeg (${aspectRatio}, ${totalAudioDuration.toFixed(1)}s)...`);
      const renderedVideoPath = path.join(workDir, `rendered_nursery_${Date.now()}.mp4`);

      await ffmpegService.renderVideo(
        {
          sceneImages: sceneImageFiles,
          voiceoverAudioPath: vocalsAudioPath,
          subtitlesPath,
          backgroundMusicPath: backingAudioPath,
          enableMusic: true,
          outputPath: renderedVideoPath,
          totalDuration: totalAudioDuration,
          aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
        },
        jobId
      );

      // 8. Step 7: AI Quality Gate (Preschool benchmarks, zero IP infringement, Made for Kids)
      logger.job(jobId, 'Step 7/8: Executing Preschool Quality Gate evaluation...');
      const qualityCheck = await nurseryQualityGate.validateNurseryVideo(
        {
          videoPath: renderedVideoPath,
          title: winningSongIdea.title,
          lyrics,
          characters: winningSongIdea.characters,
          videoType,
          aspectRatio,
          bpm: songBpm,
        },
        jobId
      );

      if (!qualityCheck.passed) {
        throw new Error(`Preschool Quality Gate failed: ${qualityCheck.issues.join('; ')}`);
      }

      // Upload video to cloud storage
      const videoBuffer = await fs.promises.readFile(renderedVideoPath);
      const storedVideo = await storageService.uploadVideo(videoBuffer, currentShortId, jobId);

      // Update short & song in DB
      await shortRepository.update(currentShortId, {
        title: winningSongIdea.title,
        script: lyrics.sections.map((s) => `[${s.type.toUpperCase()}] ${s.leadCharacter || s.singer || 'Lead'}: ${s.lyrics || (s.lines ? s.lines.join(' ') : '')}`).join('\n'),
        description: `Sing and dance along with ${winningSongIdea.characters.join(' and ')} in this cheerful learning song about ${winningSongIdea.theme}! 🎶\n\nPreschool Learning Song | Nursery Rhymes for Kids\n#NurseryRhymes #KidsSongs #Preschool #SingAlong #Shorts`,
        tags: ['NurseryRhymes', 'KidsSongs', 'Preschool', 'LearningSongs', 'Shorts'].join(','),
        videoUrl: storedVideo.url,
        durationSeconds: qualityCheck.durationSeconds,
        status: ShortStatus.VIDEO_READY,
      });

      if (createdSongId) {
        await songRepository.update(createdSongId, {
          videoUrl: storedVideo.url,
          audioUrl: storedVideo.url,
          status: 'PRODUCED',
        });
      }

      // Record environment & character appearances
      await environmentManager.incrementUsage(songEnv);
      for (const charName of winningSongIdea.characters) {
        await kidsCharacterManager.incrementAppearances(charName);
      }

      // 9. Step 8: YouTube Publishing (Strict Made-for-Kids Compliance)
      logger.job(jobId, 'Step 8/8: Publishing to YouTube with Made-for-Kids compliance...');
      const isConnected = await youtubeService.auth.isConnected();

      if (!isConnected) {
        logger.warn('YouTube not connected via OAuth. Song saved and marked UPLOAD_PENDING.', undefined, jobId);
        await shortRepository.update(currentShortId, {
          status: ShortStatus.UPLOAD_PENDING,
          errorMessage: 'YouTube account not connected. Please authorize YouTube in Admin settings.',
        });
        await jobRepository.update(jobId, {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          metadata: JSON.stringify({ note: 'Nursery video rendered, waiting for YouTube OAuth' }),
        });
        return;
      }

      await shortRepository.updateStatus(currentShortId, ShortStatus.UPLOADING);
      const youtubeResult = await youtubeService.upload.uploadVideo(
        {
          videoPath: renderedVideoPath,
          title: winningSongIdea.title,
          description: `Sing and dance along with ${winningSongIdea.characters.join(' and ')} in this cheerful learning song about ${winningSongIdea.theme}! 🎶\n\nPreschool Learning Song | Nursery Rhymes for Kids\n#NurseryRhymes #KidsSongs #Preschool #SingAlong #Shorts`,
          tags: ['NurseryRhymes', 'KidsSongs', 'Preschool', 'SingAlong', 'ToddlerMusic'],
          privacyStatus: config.youtube.privacyStatus,
          madeForKids: true,
          contentMode: 'nursery_rhymes',
          categoryId: '27', // Education
        },
        jobId
      );

      // Finalize database records
      await shortRepository.update(currentShortId, {
        youtubeVideoId: youtubeResult.videoId,
        youtubeUrl: youtubeResult.url,
        status: ShortStatus.UPLOADED,
        uploadedAt: new Date(),
        errorMessage: null,
      });

      if (createdSongId) {
        await songRepository.update(createdSongId, {
          youtubeVideoId: youtubeResult.videoId,
          status: 'UPLOADED',
        });
      }

      await jobRepository.update(jobId, {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        metadata: JSON.stringify({
          youtubeVideoId: youtubeResult.videoId,
          youtubeUrl: youtubeResult.url,
          mode: 'nursery_rhymes',
          songTitle: winningSongIdea.title,
        }),
      });

      logger.job(jobId, `🎉 Autonomous Nursery Rhymes Pipeline succeeded! Video is LIVE: ${youtubeResult.url}`);
    } catch (err: any) {
      logger.error(`Nursery Pipeline failure: ${err.message}`, undefined, jobId);
      if (currentShortId) {
        await shortRepository.update(currentShortId, {
          status: ShortStatus.FAILED,
          errorMessage: err.message,
        }).catch(() => {});
      }
      await jobRepository.update(jobId, {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: err.message,
      }).catch(() => {});
      throw err;
    } finally {
      if (workDir) {
        try {
          await fs.promises.rm(workDir, { recursive: true, force: true });
        } catch {}
      }
    }
  }
}

export const nurseryPipeline = new NurseryPipeline();
