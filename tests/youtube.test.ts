import { youtubeAuthService } from '../src/services/youtube/YouTubeAuthService';
import { youtubeUploadService } from '../src/services/youtube/YouTubeUploadService';
import { settingRepository } from '../src/repositories/SettingRepository';

describe('YouTube Integration & Quota Awareness', () => {
  describe('YouTube OAuth Service', () => {
    it('should generate valid Google OAuth URL containing YouTube scopes', () => {
      const { config } = require('../src/config');
      config.youtube.clientId = 'mock-client-id.apps.googleusercontent.com';
      config.youtube.clientSecret = 'mock-secret-key';

      const url = youtubeAuthService.getAuthUrl('test-state');
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('youtube.upload');
      expect(url).toContain('access_type=offline');
    });

    it('should return connection status based on stored refresh token', async () => {
      jest.spyOn(settingRepository, 'getSecure').mockResolvedValueOnce('mock-refresh-token');
      const isConnected = await youtubeAuthService.isConnected();
      expect(isConnected).toBe(true);

      jest.spyOn(settingRepository, 'getSecure').mockResolvedValueOnce(null);
      const isNotConnected = await youtubeAuthService.isConnected();
      expect(isNotConnected).toBe(false);
    });
  });

  describe('YouTube Upload & Quota Management', () => {
    it('should identify quotaExceeded error and throw YOUTUBE_QUOTA_EXCEEDED code', async () => {
      const fs = require('fs');
      const { Readable } = require('stream');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'createReadStream').mockReturnValue(Readable.from(['fake-video-bytes']));
      jest.spyOn(youtubeAuthService, 'getAuthenticatedClient').mockResolvedValue({} as any);

      const google = require('googleapis').google;
      jest.spyOn(google, 'youtube').mockReturnValue({
        videos: {
          insert: jest.fn().mockRejectedValue({
            response: {
              status: 403,
              data: {
                error: {
                  message: 'The request cannot be completed because you have exceeded your quota.',
                  errors: [{ reason: 'quotaExceeded' }],
                },
              },
            },
          }),
        },
      } as any);

      await expect(
        youtubeUploadService.uploadVideo({
          videoPath: '/tmp/test.mp4',
          title: 'Test Short',
          description: 'Description',
          tags: ['AI'],
        })
      ).rejects.toMatchObject({
        code: 'YOUTUBE_QUOTA_EXCEEDED',
      });
    });
  });
});
