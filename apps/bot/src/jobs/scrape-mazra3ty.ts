import type { Bot } from 'grammy';
import type { BotContext } from '../lib/locale';
import { scrapeRawMaterials, scrapeCompoundFeeds } from '../lib/mazra3ty-scraper';
import { ensureSource, upsertScrapedProducts } from '../lib/queries';

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

export interface ScrapeRunReport {
  rawMaterials: { written: number; created: string[]; sourceLabel?: string };
  compoundFeeds: { written: number; created: string[]; sourceLabel?: string };
  errors: string[];
}

export async function runMazra3tyScrape(): Promise<ScrapeRunReport> {
  const errors: string[] = [];
  const source = await ensureSource('mazra3ty', 'مزرعتي', 'Mazra3ty', 'EXCHANGE');

  let rawWritten = 0;
  let rawCreated: string[] = [];
  let rawDate: string | undefined;
  try {
    const raw = await scrapeRawMaterials();
    rawDate = raw.pageDate ?? undefined;
    const result = await upsertScrapedProducts(
      raw.products.map((p) => ({
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        category: p.category,
        unit: p.unit,
        value: p.value,
      })),
      source.id,
      `mazra3ty filter=8${rawDate ? ` (${rawDate})` : ''}`,
    );
    rawWritten = result.written;
    rawCreated = result.createdCommodities;
  } catch (err) {
    errors.push(`raw materials: ${(err as Error).message}`);
  }

  let feedWritten = 0;
  let feedCreated: string[] = [];
  let feedDate: string | undefined;
  try {
    const feed = await scrapeCompoundFeeds();
    feedDate = feed.pageDate ?? undefined;
    const result = await upsertScrapedProducts(
      feed.products.map((p) => ({
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        category: p.category,
        unit: p.unit,
        value: p.value,
      })),
      source.id,
      `mazra3ty filter=7${feedDate ? ` (${feedDate})` : ''}`,
    );
    feedWritten = result.written;
    feedCreated = result.createdCommodities;
  } catch (err) {
    errors.push(`compound feeds: ${(err as Error).message}`);
  }

  return {
    rawMaterials: { written: rawWritten, created: rawCreated, sourceLabel: rawDate },
    compoundFeeds: { written: feedWritten, created: feedCreated, sourceLabel: feedDate },
    errors,
  };
}

export async function runMazra3tyScrapeAndNotify(bot: Bot<BotContext>) {
  if (!ADMIN_ID) {
    console.warn('ADMIN_TELEGRAM_ID unset — skipping scrape notify');
    return;
  }
  console.info('🌾 starting mazra3ty scrape');
  const report = await runMazra3tyScrape();
  console.info('🌾 scrape result:', JSON.stringify(report));

  const lines = ['*📥 سحب أسعار مزرعتي*', ''];
  lines.push(`خامات: *${report.rawMaterials.written}* سعر${report.rawMaterials.created.length > 0 ? ` (+${report.rawMaterials.created.length} منتج جديد)` : ''}`);
  lines.push(`أعلاف: *${report.compoundFeeds.written}* سعر${report.compoundFeeds.created.length > 0 ? ` (+${report.compoundFeeds.created.length} منتج جديد)` : ''}`);
  if (report.errors.length > 0) {
    lines.push('', '⚠️ أخطاء:');
    report.errors.forEach((e) => lines.push(`• ${e}`));
  }
  try {
    await bot.api.sendMessage(ADMIN_ID, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('failed to notify admin:', err);
  }
}
