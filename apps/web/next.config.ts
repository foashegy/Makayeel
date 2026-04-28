import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@makayeel/ui', '@makayeel/i18n', '@makayeel/db'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.node',
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**',
      '../../node_modules/.pnpm/.prisma/client/**',
    ],
  },
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
};

export default withNextIntl(config);
