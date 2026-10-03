import { prisma } from '../config/database.js';
import { Environment } from '@prisma/client';

export interface CreateEnvironmentInput {
  name: string;
  category: string;
  description: string;
  lighting: string;
  colorTheme: { primary: string; secondary: string; accent: string };
  props: string[];
  referenceImage?: string;
}

export class EnvironmentRepository {
  async findAll(): Promise<Environment[]> {
    return prisma.environment.findMany({
      orderBy: { usageCount: 'desc' },
    });
  }

  async findByName(name: string): Promise<Environment | null> {
    return prisma.environment.findUnique({
      where: { name },
    });
  }

  async create(data: CreateEnvironmentInput): Promise<Environment> {
    return prisma.environment.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        lighting: data.lighting,
        colorTheme: data.colorTheme,
        props: data.props,
        referenceImage: data.referenceImage || null,
      },
    });
  }

  async incrementUsage(name: string): Promise<void> {
    await prisma.environment.update({
      where: { name },
      data: { usageCount: { increment: 1 } },
    }).catch(() => {});
  }
}

export const environmentRepository = new EnvironmentRepository();
