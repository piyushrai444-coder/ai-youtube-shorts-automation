import { StorageProvider, StoredFile } from './StorageProvider.js';
import { S3StorageProvider } from './S3StorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class StorageService {
  private provider: StorageProvider;

  constructor(customProvider?: StorageProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else {
      const type = config.storage.provider.toLowerCase();
      if ((type === 's3' || type === 'r2' || type === 'b2') && config.storage.accessKey) {
        this.provider = new S3StorageProvider();
      } else {
        this.provider = new LocalStorageProvider();
      }
    }
    logger.info(`StorageService initialized with provider: ${this.provider.name}`);
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async uploadFile(file: Buffer, key: string, mimeType: string, jobId?: string): Promise<StoredFile> {
    logger.job(jobId || 'sys', `Uploading ${key} (${(file.length / 1024 / 1024).toFixed(2)} MB) to storage`);
    return this.provider.upload(file, key, mimeType);
  }

  async uploadVideo(buffer: Buffer, shortId: string, jobId?: string): Promise<StoredFile> {
    const key = `videos/${shortId}.mp4`;
    return this.uploadFile(buffer, key, 'video/mp4', jobId);
  }

  async uploadThumbnail(buffer: Buffer, shortId: string, jobId?: string): Promise<StoredFile> {
    const key = `thumbnails/${shortId}.png`;
    return this.uploadFile(buffer, key, 'image/png', jobId);
  }

  async uploadAudio(buffer: Buffer, shortId: string, jobId?: string): Promise<StoredFile> {
    const key = `audio/${shortId}.mp3`;
    return this.uploadFile(buffer, key, 'audio/mpeg', jobId);
  }

  async uploadCaptions(buffer: Buffer, shortId: string, jobId?: string): Promise<StoredFile> {
    const key = `captions/${shortId}.srt`;
    return this.uploadFile(buffer, key, 'text/plain', jobId);
  }
}

export const storageService = new StorageService();
