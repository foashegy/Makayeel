import type { ScrapeResult } from './mazra3ty-scraper';

/**
 * Global commodity futures scraper. Pulls real-time settlement prices from
 * Yahoo Finance (no auth required, JSON API) for the major feed-grain
 * futures, fetches USD/EGP, and emits EGP/ton equivalents.
 *
 * - Corn futures ZC=F: cents per bushel; 1 ton = 39.368 bushels (25.4 kg/bu)
 * - Soybean futures ZS=F: cents per bushel; 1 ton = 36.744 bushels (27.2 kg)
 * - Soybean meal ZM=F: USD per short ton (2000 lbs); ×1.10231 → metric ton
 * - Soybean oil ZL=F: cents per pound; ×22.0462 → USD/MT
 * - Wheat ZW=F: cents per bushel; 1 ton = 36.744 bushels
 *
 * Why this matters: Egyptian feed-mill operators care about world prices
 * because Alex Port pricing tracks Chicago futures with a freight + customs
 * premium. Surfacing the futures alongside local boards lets buyers see if
 * a port quote is fair vs the global benchmark.
 */

const FUTURES = {
  'yellow-corn': { ticker: 'ZC=F', unit: 'cents/bu', bushelToTon: 39.368 },
  'soybean-meal-46': { ticker: 'ZM=F', unit: 'usd/short-ton', shortToMetric: 1.10231 },
  'soybean-meal-44': { ticker: 'ZM=F', unit: 'usd/short-ton', shortToMetric: 1.10231 },
  // Soybean oil: cents/lb → USD/lb (÷100) → USD/MT (×2204.62 lb/MT).
  'crude-soybean-oil': { ticker: 'ZL=F', unit: 'cents/lb', lbToTon: 2204.62 },
} as const;

async function fetchUsdEgp(): Promise<number> {
  // open.er-api.com — actually free (no key). Returns base USD against
  // every other currency. Falls back to frankfurter.app if it fails.
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot)' },
    });
    if (res.ok) {
      const j = (await res.json()) as { rates?: { EGP?: number }; result?: string };
      const rate = j.rates?.EGP;
      if (rate && rate >= 30 && rate <= 200 && j.result === 'success') return rate;
    }
  } catch {
    // fall through to backup
  }
  // Backup: frankfurter.app (ECB rates, free, no key).
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EGP', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot)' },
  });
  if (!res.ok) throw new Error(`USD/EGP fetch ${res.status}`);
  const j = (await res.json()) as { rates?: { EGP?: number } };
  const rate = j.rates?.EGP;
  if (!rate || rate < 30 || rate > 200) throw new Error(`unexpected USD/EGP rate ${rate}`);
  return rate;
}

/**
 * Yahoo Finance's v7/quote now requires a crumb cookie. We use the v8/chart
 * endpoint instead — works without auth and returns the latest close in
 * `meta.regularMarketPrice`. Per-symbol request to keep the URL simple.
 */
async function fetchYahooQuote(symbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot)' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const px = j.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof px === 'number' && px > 0 ? px : null;
  } catch (err) {
    console.warn(`[global-cme] ${symbol} fetch failed:`, (err as Error).message);
    return null;
  }
}

async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, number>> {
  const results = await Promise.all(symbols.map((s) => fetchYahooQuote(s).then((px) => [s, px] as const)));
  const map = new Map<string, number>();
  for (const [s, px] of results) {
    if (px !== null) map.set(s, px);
  }
  return map;
}

function convertToEgpPerTon(slug: keyof typeof FUTURES, raw: number, usdEgp: number): number {
  const cfg = FUTURES[slug];
  let usdPerTon: number;
  if (cfg.unit === 'cents/bu') {
    // raw is cents/bushel → USD/bushel → USD/ton
    usdPerTon = (raw / 100) * cfg.bushelToTon;
  } else if (cfg.unit === 'usd/short-ton') {
    usdPerTon = raw * cfg.shortToMetric;
  } else if (cfg.unit === 'cents/lb') {
    usdPerTon = (raw / 100) * cfg.lbToTon;
  } else {
    throw new Error(`unknown unit ${(cfg as { unit: string }).unit}`);
  }
  return Math.round(usdPerTon * usdEgp);
}

export async function scrapeGlobalCmeFutures(): Promise<ScrapeResult> {
  // Symbols dedupe — ZM=F is reused for both soybean meal grades.
  const tickers = [...new Set(Object.values(FUTURES).map((c) => c.ticker))];
  const [usdEgp, prices] = await Promise.all([fetchUsdEgp(), fetchYahooQuotes(tickers)]);

  const products: ScrapeResult['products'] = [];
  for (const [slug, cfg] of Object.entries(FUTURES) as [keyof typeof FUTURES, typeof FUTURES[keyof typeof FUTURES]][]) {
    const raw = prices.get(cfg.ticker);
    if (raw === undefined) continue;
    const value = convertToEgpPerTon(slug, raw, usdEgp);
    if (value < 100 || value > 200_000) continue; // sanity bounds matching Zod schema
    // These slugs already exist (yellow-corn, soybean-meal-46/44,
    // crude-soybean-oil) so the existing nameAr/nameEn stays. We provide
    // sensible defaults in case Postgres is empty / fresh.
    const fallbackNames: Record<string, [string, string]> = {
      'yellow-corn': ['ذرة صفراء', 'Yellow Corn'],
      'soybean-meal-46': ['كسب فول الصويا 46%', 'Soybean Meal 46%'],
      'soybean-meal-44': ['كسب فول الصويا 44%', 'Soybean Meal 44%'],
      'crude-soybean-oil': ['زيت صويا خام', 'Crude Soybean Oil'],
    };
    const [nameAr, nameEn] = fallbackNames[slug] ?? [slug, slug];
    products.push({
      nameAr,
      nameEn,
      slug,
      category: slug.includes('oil') ? 'OILS' : slug.includes('meal') ? 'PROTEINS' : 'GRAINS',
      unit: 'EGP/ton',
      value,
      date: null,
    });
  }

  return {
    products,
    pageDate: new Date().toISOString().slice(0, 10),
  };
}

/** Companion no-op: futures are raw materials only — there are no compound
 * feed futures to scrape globally. Kept so the SiteConfig shape stays
 * uniform with the other site scrapers. */
export async function scrapeGlobalCmeCompoundFeeds(): Promise<ScrapeResult> {
  return { products: [], pageDate: null };
}
