import { youtubeAuthService, YouTubeAuthService } from './YouTubeAuthService.js';
import { youtubeUploadService, YouTubeUploadService } from './YouTubeUploadService.js';

export class YouTubeService {
  constructor(
    public auth: YouTubeAuthService = youtubeAuthService,
    public upload: YouTubeUploadService = youtubeUploadService
  ) {}
}

export const youtubeService = new YouTubeService();
