import { stripHtml, extractFromHtml, type ScrapeResult } from './mazra3ty-scraper';

const URLS = {
  raw: 'https://elmorshdledwagn.com/prices/l1',
  feed: 'https://elmorshdledwagn.com/prices/2',
  livePoultry: 'https://elmorshdledwagn.com/prices/l2',
  eggs: 'https://elmorshdledwagn.com/prices/5',
};

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot scraper)' },
  });
  if (!res.ok) throw new Error(`elmorshd fetch failed: ${res.status}`);
  return stripHtml(await res.text());
}

export async function scrapeElmorshdRawMaterials(): Promise<ScrapeResult> {
  const html = await fetchPage(URLS.raw);
  return extractFromHtml(html, 'raw_materials', 'elmorshdledwagn.com');
}

export async function scrapeElmorshdCompoundFeeds(): Promise<ScrapeResult> {
  const html = await fetchPage(URLS.feed);
  return extractFromHtml(html, 'compound_feeds', 'elmorshdledwagn.com');
}

export async function scrapeElmorshdLivePoultry(): Promise<ScrapeResult> {
  const html = await fetchPage(URLS.livePoultry);
  return extractFromHtml(html, 'live_poultry', 'elmorshdledwagn.com');
}

export async function scrapeElmorshdEggs(): Promise<ScrapeResult> {
  const html = await fetchPage(URLS.eggs);
  return extractFromHtml(html, 'eggs', 'elmorshdledwagn.com');
}
