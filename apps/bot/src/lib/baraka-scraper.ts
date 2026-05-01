import { stripHtml, extractFromHtml, type ScrapeResult } from './mazra3ty-scraper';

/**
 * Scrapes Baraka Feed's public price page. The page uses the same vision-
 * extraction pipeline as mazra3ty + elmorshd, just pointed at a different
 * URL with a different siteName for the system prompt.
 *
 * If barakafeed.net/prices is empty (Baraka's "contact us for prices"
 * model), the extractor returns { products: [], pageDate: null } and the
 * scrape job logs an empty ScrapeRun row — no harm done.
 */
const BARAKA_URL = 'https://barakafeed.net/prices';

async function fetchBarakaPage(): Promise<string> {
  const res = await fetch(BARAKA_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot scraper)' },
  });
  if (!res.ok) throw new Error(`barakafeed fetch failed: ${res.status}`);
  return stripHtml(await res.text());
}

/** Baraka publishes mostly compound feeds (cattle/poultry/sheep), so we hint
 * the extractor accordingly. Any raw materials Baraka happens to list will
 * still extract (Claude tags category per-row). */
export async function scrapeBarakaCompoundFeeds(): Promise<ScrapeResult> {
  const html = await fetchBarakaPage();
  return extractFromHtml(html, 'compound_feeds', 'barakafeed.net');
}

export async function scrapeBarakaRawMaterials(): Promise<ScrapeResult> {
  const html = await fetchBarakaPage();
  return extractFromHtml(html, 'raw_materials', 'barakafeed.net');
}
