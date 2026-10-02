import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, StoredFile } from './StorageProvider.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class S3StorageProvider implements StorageProvider {
  name = 'S3StorageProvider';
  private s3Client: S3Client;
  private bucket: string;
  private publicEndpoint: string;

  constructor(options?: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKey?: string;
    secretKey?: string;
  }) {
    this.bucket = options?.bucket || config.storage.bucket;
    const region = options?.region || config.storage.region || 'us-east-1';
    const endpoint = options?.endpoint || config.storage.endpoint;
    const accessKeyId = options?.accessKey || config.storage.accessKey;
    const secretAccessKey = options?.secretKey || config.storage.secretKey;

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO, Cloudflare R2, and custom S3 endpoints
    });

    this.publicEndpoint = endpoint
      ? `${endpoint}/${this.bucket}`
      : `https://${this.bucket}.s3.${region}.amazonaws.com`;
  }

  async upload(file: Buffer, key: string, mimeType: string): Promise<StoredFile> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);
      return {
        url,
        key,
        size: file.length,
        mimeType,
      };
    } catch (err: any) {
      logger.error(`S3 Upload failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty body returned for S3 key: ${key}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  getPublicUrl(key: string): string {
    return `${this.publicEndpoint}/${key}`;
  }
}
