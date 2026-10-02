import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';
import { settingRepository } from '../../repositories/SettingRepository.js';
import { ChannelInfo } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const SETTING_KEY_REFRESH_TOKEN = 'youtube_refresh_token';
const SETTING_KEY_CHANNEL_INFO = 'youtube_channel_info';

export class YouTubeAuthService {
  async ensureCredentialsLoaded(): Promise<void> {
    if (!config.youtube.clientId) {
      const dbId = (await settingRepository.get('google_client_id')) || (await settingRepository.getSecure('google_client_id'));
      if (dbId) config.youtube.clientId = dbId;
    }
    if (!config.youtube.clientSecret) {
      const dbSecret = await settingRepository.getSecure('google_client_secret');
      if (dbSecret) config.youtube.clientSecret = dbSecret;
    }
  }

  private createOAuth2Client(): OAuth2Client {
    const clientId = config.youtube.clientId;
    const clientSecret = config.youtube.clientSecret;
    const redirectUri = config.youtube.redirectUri;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured. Please enter them in Settings or Render environment variables.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(state: string = 'admin'): string {
    const oauth2Client = this.createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Critical for obtaining a refresh token
      prompt: 'consent',     // Forces consent to guarantee a refresh token
      scope: SCOPES,
      state,
    });
  }

  async handleCallback(code: string): Promise<ChannelInfo> {
    await this.ensureCredentialsLoaded();
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Check if we already have an existing refresh token in DB
      const existingToken = await settingRepository.getSecure(SETTING_KEY_REFRESH_TOKEN);
      if (!existingToken) {
        throw new Error('No refresh token received from Google. Please re-authorize with prompt=consent.');
      }
      tokens.refresh_token = existingToken;
    } else {
      // Store encrypted refresh token securely
      await settingRepository.setSecure(SETTING_KEY_REFRESH_TOKEN, tokens.refresh_token);
    }

    oauth2Client.setCredentials(tokens);

    // Fetch channel info
    const channelInfo = await this.fetchChannelInfo(oauth2Client);
    await settingRepository.set(SETTING_KEY_CHANNEL_INFO, JSON.stringify(channelInfo));
    logger.info(`YouTube successfully connected to channel: "${channelInfo.title}" (${channelInfo.id})`);

    return channelInfo;
  }

  async getAuthenticatedClient(): Promise<OAuth2Client> {
    await this.ensureCredentialsLoaded();
    const refreshToken = await settingRepository.getSecure(SETTING_KEY_REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('YouTube is not connected. Please authorize YouTube in the Admin panel.');
    }

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  async isConnected(): Promise<boolean> {
    try {
      const refreshToken = await settingRepository.getSecure(SETTING_KEY_REFRESH_TOKEN);
      return !!refreshToken;
    } catch {
      return false;
    }
  }

  async getStoredChannelInfo(): Promise<ChannelInfo | null> {
    try {
      const raw = await settingRepository.get(SETTING_KEY_CHANNEL_INFO);
      if (raw) return JSON.parse(raw);
      if (await this.isConnected()) {
        const client = await this.getAuthenticatedClient();
        const info = await this.fetchChannelInfo(client);
        await settingRepository.set(SETTING_KEY_CHANNEL_INFO, JSON.stringify(info));
        return info;
      }
      return null;
    } catch (err: any) {
      logger.warn(`Could not get stored channel info: ${err.message}`);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.ensureCredentialsLoaded();
      const refreshToken = await settingRepository.getSecure(SETTING_KEY_REFRESH_TOKEN);
      if (refreshToken) {
        const oauth2Client = this.createOAuth2Client();
        await oauth2Client.revokeToken(refreshToken);
      }
    } catch (err: any) {
      logger.warn(`Failed to revoke token at Google: ${err.message}`);
    } finally {
      await settingRepository.delete(SETTING_KEY_REFRESH_TOKEN);
      await settingRepository.delete(SETTING_KEY_CHANNEL_INFO);
      logger.info('YouTube connection disconnected.');
    }
  }

  private async fetchChannelInfo(client: OAuth2Client): Promise<ChannelInfo> {
    const youtube = google.youtube({ version: 'v3', auth: client });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel || !channel.id) {
      throw new Error('No YouTube channel associated with this Google account');
    }

    return {
      id: channel.id,
      title: channel.snippet?.title || 'Unknown Channel',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl || '',
      thumbnail: channel.snippet?.thumbnails?.default?.url || '',
    };
  }
}

export const youtubeAuthService = new YouTubeAuthService();
