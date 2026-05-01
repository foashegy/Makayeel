import { stripHtml, extractFromHtml, type ScrapeResult } from './mazra3ty-scraper';

/**
 * Esraa Trade — Egyptian feed retailer that publishes its compound-feed
 * prices on the homepage (per-50kg-bag basis). The Claude prompt in
 * extractFromHtml is generic about EGP/ton; we wrap with a hint to remind
 * it to multiply by 20 for any per-bag prices it sees.
 */
const URL = 'https://esraatrade.com';

async function fetchPage(): Promise<string> {
  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Makayeel-Bot scraper)' },
  });
  if (!res.ok) throw new Error(`esraatrade fetch failed: ${res.status}`);
  // Prepend a short text hint so the Claude prompt knows units may vary.
  // The prompt itself already enforces EGP/ton output; this just nudges it
  // towards correct conversion when the page says "شيكارة 50 كيلو".
  return `<!-- HINT: prices on this page are in EGP per 50kg bag — multiply by 20 to get EGP/ton -->\n${stripHtml(await res.text())}`;
}

export async function scrapeEsraatradeCompoundFeeds(): Promise<ScrapeResult> {
  return extractFromHtml(await fetchPage(), 'compound_feeds', 'esraatrade.com');
}

export async function scrapeEsraatradeRawMaterials(): Promise<ScrapeResult> {
  return extractFromHtml(await fetchPage(), 'raw_materials', 'esraatrade.com');
}
