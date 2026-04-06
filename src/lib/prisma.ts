import { PrismaClient } from '../generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

// Single shared instance — avoids exhausting connection pool
export const prisma = new PrismaClient({ adapter });
