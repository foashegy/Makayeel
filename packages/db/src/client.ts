import { PrismaClient } from '@prisma/client';

declare global {
  // Reuse client across HMR reloads in dev to avoid exhausting Postgres connections.
  // eslint-disable-next-line no-var
  var __makayeelPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__makayeelPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__makayeelPrisma = prisma;
}
