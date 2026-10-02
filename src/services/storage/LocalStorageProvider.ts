import fs from 'fs';
import path from 'path';
import { StorageProvider, StoredFile } from './StorageProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class LocalStorageProvider implements StorageProvider {
  name = 'LocalStorageProvider';
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir?: string, baseUrl?: string) {
    this.uploadDir = uploadDir || config.storage.localUploadDir;
    this.baseUrl = baseUrl || config.appUrl;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, key: string, mimeType: string): Promise<StoredFile> {
    const fullPath = path.join(this.uploadDir, key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file);

    const url = this.getPublicUrl(key);
    logger.debug(`Stored local file: ${fullPath} -> ${url}`);

    return {
      url,
      key,
      size: file.length,
      mimeType,
    };
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, key);
    return fs.promises.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}
