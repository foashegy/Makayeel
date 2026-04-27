import type { Commodity } from '@makayeel/db/types';

/**
 * Very small fuzzy matcher for commodity lookup.
 * Accepts Arabic or English input; normalizes whitespace, diacritics, hamzas.
 * Returns the best commodity match or null.
 */
export function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u0652\u0670]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, ' ');
}

function tokens(s: string): string[] {
  return normalizeAr(s).split(/\s+/).filter(Boolean);
}

/** Count how many tokens from `query` appear inside `haystack`. */
function overlapScore(query: string, haystack: string): number {
  const q = tokens(query);
  const h = normalizeAr(haystack);
  let score = 0;
  for (const tok of q) {
    if (!tok) continue;
    if (h.includes(tok)) score += tok.length;
  }
  return score;
}

export function matchCommodity(
  query: string,
  commodities: Commodity[],
): Commodity | null {
  if (!query) return null;
  const candidates = commodities.map((c) => {
    const score = Math.max(
      overlapScore(query, c.slug.replace(/-/g, ' ')),
      overlapScore(query, c.nameAr),
      overlapScore(query, c.nameEn),
    );
    return { c, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score >= 2 ? best.c : null;
}
