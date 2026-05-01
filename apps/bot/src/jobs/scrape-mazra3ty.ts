import type { Bot } from 'grammy';
import type { BotContext } from '../lib/locale';
import { prisma } from '@makayeel/db';
import { scrapeRawMaterials, scrapeCompoundFeeds } from '../lib/mazra3ty-scraper';
import { scrapeElmorshdRawMaterials, scrapeElmorshdCompoundFeeds } from '../lib/elmorshd-scraper';
import { scrapeBarakaRawMaterials, scrapeBarakaCompoundFeeds } from '../lib/baraka-scraper';
import { scrapeEsraatradeRawMaterials, scrapeEsraatradeCompoundFeeds } from '../lib/esraatrade-scraper';
import { ensureSource, upsertScrapedProducts } from '../lib/queries';
import type { ScrapedProduct } from '../lib/mazra3ty-scraper';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

export interface SiteResult {
  written: number;
  created: string[];
  errors: string[];
}

export interface ScrapeRunReport {
  mazra3ty: { raw: SiteResult; feed: SiteResult };
  elmorshd: { raw: SiteResult; feed: SiteResult };
  baraka: { raw: SiteResult; feed: SiteResult };
  esraatrade: { raw: SiteResult; feed: SiteResult };
}

interface SiteConfig {
  slug: string;
  nameAr: string;
  nameEn: string;
  /** Source type to register the source under. Aggregator boards = EXCHANGE,
   * direct mill price pages = FACTORY, retailers = WHOLESALER. */
  type: 'EXCHANGE' | 'FACTORY' | 'WHOLESALER';
  scrapeRaw: () => Promise<{ products: ScrapedProduct[]; pageDate?: string | null }>;
  scrapeFeed: () => Promise<{ products: ScrapedProduct[]; pageDate?: string | null }>;
}

const SITES: SiteConfig[] = [
  {
    slug: 'mazra3ty',
    nameAr: 'مزرعتي',
    nameEn: 'Mazra3ty',
    type: 'EXCHANGE',
    scrapeRaw: scrapeRawMaterials,
    scrapeFeed: scrapeCompoundFeeds,
  },
  {
    slug: 'elmorshd',
    nameAr: 'المرشد للدواجن',
    nameEn: 'Al-Morshid for Poultry',
    type: 'EXCHANGE',
    scrapeRaw: scrapeElmorshdRawMaterials,
    scrapeFeed: scrapeElmorshdCompoundFeeds,
  },
  {
    slug: 'baraka-feed',
    nameAr: 'بركة للأعلاف',
    nameEn: 'Baraka Feed',
    type: 'FACTORY',
    scrapeRaw: scrapeBarakaRawMaterials,
    scrapeFeed: scrapeBarakaCompoundFeeds,
  },
  {
    slug: 'esraatrade',
    nameAr: 'إسراء تريد',
    nameEn: 'Esraa Trade',
    type: 'WHOLESALER',
    scrapeRaw: scrapeEsraatradeRawMaterials,
    scrapeFeed: scrapeEsraatradeCompoundFeeds,
  },
];

async function runOne(
  source: { id: string; slug: string },
  scrape: () => Promise<{ products: ScrapedProduct[]; pageDate?: string | null }>,
  refLabel: string,
  pageHint: 'raw_materials' | 'compound_feeds',
  trigger: 'cron' | 'manual',
): Promise<SiteResult> {
  const startedAt = new Date();
  const t0 = Date.now();
  let productsRead = 0;
  let written = 0;
  let created: string[] = [];
  let errorMessage: string | null = null;

  try {
    const r = await scrape();
    productsRead = r.products.length;
    const dateSuffix = r.pageDate ? ` (${r.pageDate})` : '';
    const auditSource: 'scraper_mazra3ty' | 'scraper_elmorshd' =
      source.slug === 'elmorshd' ? 'scraper_elmorshd' : 'scraper_mazra3ty';
    const result = await upsertScrapedProducts(
      r.products.map((p) => ({
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        category: p.category,
        unit: p.unit,
        value: p.value,
      })),
      source.id,
      `${refLabel}${dateSuffix}`,
      { source: auditSource, actorUserId: null },
    );
    written = result.written;
    created = result.createdCommodities;
  } catch (err) {
    errorMessage = (err as Error).message.slice(0, 500);
  }

  // Log the run (best-effort).
  try {
    await prisma.scrapeRun.create({
      data: {
        siteSlug: source.slug,
        pageHint,
        trigger,
        durationMs: Date.now() - t0,
        productsRead,
        pricesWritten: written,
        createdSlugs: created,
        error: errorMessage,
        startedAt,
      },
    });
  } catch (logErr) {
    console.error('[scrape-run] failed to log run:', (logErr as Error).message);
  }

  return { written, created, errors: errorMessage ? [errorMessage] : [] };
}

export async function runMazra3tyScrape(trigger: 'cron' | 'manual' = 'manual'): Promise<ScrapeRunReport> {
  const empty = (): SiteResult => ({ written: 0, created: [], errors: [] });
  const report: ScrapeRunReport = {
    mazra3ty: { raw: empty(), feed: empty() },
    elmorshd: { raw: empty(), feed: empty() },
    baraka: { raw: empty(), feed: empty() },
    esraatrade: { raw: empty(), feed: empty() },
  };

  for (const site of SITES) {
    const source = await ensureSource(site.slug, site.nameAr, site.nameEn, site.type);
    const sourceWithSlug = { id: source.id, slug: site.slug };
    const [raw, feed] = await Promise.all([
      runOne(sourceWithSlug, site.scrapeRaw, `${site.slug} raw`, 'raw_materials', trigger),
      runOne(sourceWithSlug, site.scrapeFeed, `${site.slug} feed`, 'compound_feeds', trigger),
    ]);
    if (site.slug === 'mazra3ty') report.mazra3ty = { raw, feed };
    else if (site.slug === 'elmorshd') report.elmorshd = { raw, feed };
    else if (site.slug === 'baraka-feed') report.baraka = { raw, feed };
    else if (site.slug === 'esraatrade') report.esraatrade = { raw, feed };
  }

  return report;
}

function formatSiteLine(label: string, result: { raw: SiteResult; feed: SiteResult }): string[] {
  const lines = [`*${label}*`];
  lines.push(`  🌽 خامات: ${result.raw.written}${result.raw.created.length > 0 ? ` (+${result.raw.created.length} جديد)` : ''}`);
  lines.push(`  🐔 أعلاف: ${result.feed.written}${result.feed.created.length > 0 ? ` (+${result.feed.created.length} جديد)` : ''}`);
  const errs = [...result.raw.errors, ...result.feed.errors];
  if (errs.length > 0) lines.push(`  ⚠️ ${errs.join(' | ')}`);
  return lines;
}

export async function runMazra3tyScrapeAndNotify(bot: Bot<BotContext>) {
  if (!ADMIN_ID) {
    console.warn('ADMIN_TELEGRAM_ID unset — skipping scrape notify');
    return;
  }
  console.info('🌾 starting daily price scrape');
  const report = await runMazra3tyScrape('cron');
  console.info('🌾 scrape result:', JSON.stringify(report));

  const lines = ['*📥 سحب الأسعار اليومي*', ''];
  lines.push(...formatSiteLine('مزرعتي', report.mazra3ty));
  lines.push('');
  lines.push(...formatSiteLine('المرشد للدواجن', report.elmorshd));
  lines.push('');
  lines.push(...formatSiteLine('بركة للأعلاف', report.baraka));
  lines.push('');
  lines.push(...formatSiteLine('إسراء تريد', report.esraatrade));

  try {
    await bot.api.sendMessage(ADMIN_ID, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('failed to notify admin:', err);
  }
}
