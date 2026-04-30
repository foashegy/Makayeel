import type { MetadataRoute } from 'next';
import { prisma } from '@makayeel/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://makayeel.com';

// Render at request-time so we can query the live commodity list. Caching is
// handled at the CDN/Netlify edge via the route's default behaviour.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['', '/prices', '/pricing', '/about', '/privacy', '/terms', '/login', '/signup'];
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ['ar', 'en'] as const) {
    for (const path of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '/prices' ? 'hourly' : path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : path === '/prices' ? 0.95 : 0.6,
      });
    }
  }

  // Best-effort dynamic commodity URLs. If the DB isn't reachable at build
  // time (e.g. missing env), still return the static set so build succeeds.
  try {
    const commodities = await prisma.commodity.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    for (const locale of ['ar', 'en'] as const) {
      for (const c of commodities) {
        entries.push({
          url: `${siteUrl}/${locale}/commodities/${c.slug}`,
          lastModified: c.updatedAt,
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.warn('[sitemap] commodity fetch failed, returning static-only entries:', (err as Error).message);
  }

  return entries;
}
