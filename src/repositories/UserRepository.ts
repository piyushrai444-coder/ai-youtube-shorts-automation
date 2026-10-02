import { prisma } from '../config/database.js';
import { User } from '@prisma/client';

export class UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const trimmed = username.trim();
    const exact = await prisma.user.findUnique({
      where: { username: trimmed },
    });
    if (exact) return exact;

    return prisma.user.findFirst({
      where: {
        username: {
          equals: trimmed,
          mode: 'insensitive',
        },
      },
    });
  }

  async listAll(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async create(username: string, passwordHash: string): Promise<User> {
    return prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });
  }
}

export const userRepository = new UserRepository();
