import { describe, it, expect } from 'vitest';
import { matchCommodity, normalizeAr } from '../lib/fuzzy';
import type { Commodity } from '@makayeel/db/types';

const commodities = [
  { id: '1', slug: 'yellow-corn', nameAr: 'ذرة صفراء', nameEn: 'Yellow Corn', category: 'GRAINS' },
  { id: '2', slug: 'white-corn', nameAr: 'ذرة بيضاء', nameEn: 'White Corn', category: 'GRAINS' },
  { id: '3', slug: 'soybean-meal-46', nameAr: 'كسب فول الصويا 46%', nameEn: 'Soybean Meal 46%', category: 'PROTEINS' },
  { id: '4', slug: 'wheat-bran', nameAr: 'نخالة قمح', nameEn: 'Wheat Bran', category: 'BYPRODUCTS' },
  { id: '5', slug: 'barley', nameAr: 'شعير', nameEn: 'Barley', category: 'GRAINS' },
] as unknown as Commodity[];

describe('matchCommodity', () => {
  it('matches Arabic query to Arabic name', () => {
    const m = matchCommodity('ذرة', commodities);
    expect(m).toBeTruthy();
    expect(m?.slug).toMatch(/corn$/);
  });

  it('matches English query to English name', () => {
    const m = matchCommodity('corn', commodities);
    expect(m?.slug).toMatch(/corn$/);
  });

  it('matches "فول صويا" to soybean meal', () => {
    const m = matchCommodity('فول صويا', commodities);
    expect(m?.slug).toBe('soybean-meal-46');
  });

  it('tolerates diacritics and alefs', () => {
    expect(matchCommodity('ذُرة', commodities)?.slug).toMatch(/corn$/);
    expect(matchCommodity('ذرة صفراء', commodities)?.slug).toBe('yellow-corn');
  });

  it('returns null for gibberish', () => {
    expect(matchCommodity('xyzqwe', commodities)).toBeNull();
  });

  it('matches slug directly', () => {
    expect(matchCommodity('wheat bran', commodities)?.slug).toBe('wheat-bran');
  });

  it('is case-insensitive for English', () => {
    expect(matchCommodity('BARLEY', commodities)?.slug).toBe('barley');
  });
});

describe('normalizeAr', () => {
  it('strips diacritics', () => {
    expect(normalizeAr('ذُرَّة')).toBe('ذره');
  });
  it('normalizes hamzas', () => {
    expect(normalizeAr('إنذار')).toBe('انذار');
  });
  it('collapses whitespace', () => {
    expect(normalizeAr('  ذرة   صفراء  ')).toBe('ذره صفراء');
  });
});
