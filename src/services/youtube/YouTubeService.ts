import { youtubeAuthService, YouTubeAuthService } from './YouTubeAuthService.js';
import { youtubeUploadService, YouTubeUploadService } from './YouTubeUploadService.js';
import { youtubeAnalyticsService, YouTubeAnalyticsService } from './YouTubeAnalyticsService.js';

export class YouTubeService {
  constructor(
    public auth: YouTubeAuthService = youtubeAuthService,
    public upload: YouTubeUploadService = youtubeUploadService,
    public analytics: YouTubeAnalyticsService = youtubeAnalyticsService
  ) {}
}

export const youtubeService = new YouTubeService();
