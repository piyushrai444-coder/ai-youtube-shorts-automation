import { prisma } from '../config/database.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export class SettingRepository {
  async get(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return setting ? setting.value : defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getSecure(key: string): Promise<string | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return decrypt(raw);
    } catch {
      return null;
    }
  }

  async setSecure(key: string, secretValue: string): Promise<void> {
    const encrypted = encrypt(secretValue);
    await this.set(key, encrypted);
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async delete(key: string): Promise<void> {
    await prisma.setting.deleteMany({
      where: { key },
    });
  }
}

export const settingRepository = new SettingRepository();
