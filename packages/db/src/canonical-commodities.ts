/**
 * Canonical commodity registry — the ONLY source of truth for what commodities
 * exist in Makayeel. Scrapers and Vision OCR must map their parsed names to one
 * of these slugs; they MUST NOT create new commodities on the fly.
 *
 * If a real new commodity needs to be added, edit this file + run a migration.
 */

import { CommodityCategory } from '@prisma/client';

export type CanonicalCommodity = {
  slug: string;
  nameAr: string;
  nameEn: string;
  category: CommodityCategory;
  iconKey: string;
  displayOrder: number;
};

export const CANONICAL_COMMODITIES: CanonicalCommodity[] = [
  // Grains
  { slug: 'yellow-corn',        nameAr: 'ذرة صفراء',        nameEn: 'Yellow Corn',        category: CommodityCategory.GRAINS,      iconKey: 'corn',     displayOrder: 1 },
  { slug: 'white-corn',         nameAr: 'ذرة بيضاء',         nameEn: 'White Corn',         category: CommodityCategory.GRAINS,      iconKey: 'corn',     displayOrder: 2 },
  { slug: 'barley',             nameAr: 'شعير',              nameEn: 'Barley',             category: CommodityCategory.GRAINS,      iconKey: 'barley',   displayOrder: 3 },

  // Proteins / meals
  { slug: 'soybean-meal-44',    nameAr: 'كسب فول الصويا 44%', nameEn: 'Soybean Meal 44%',   category: CommodityCategory.PROTEINS,    iconKey: 'soy',      displayOrder: 10 },
  { slug: 'soybean-meal-46',    nameAr: 'كسب فول الصويا 46%', nameEn: 'Soybean Meal 46%',   category: CommodityCategory.PROTEINS,    iconKey: 'soy',      displayOrder: 11 },
  { slug: 'soybean-meal-48',    nameAr: 'كسب فول الصويا 48%', nameEn: 'Soybean Meal 48%',   category: CommodityCategory.PROTEINS,    iconKey: 'soy',      displayOrder: 12 },
  { slug: 'sunflower-meal',     nameAr: 'كسب عباد الشمس',     nameEn: 'Sunflower Meal',     category: CommodityCategory.PROTEINS,    iconKey: 'sunflower',displayOrder: 13 },

  // Byproducts
  { slug: 'wheat-bran',         nameAr: 'نخالة قمح',          nameEn: 'Wheat Bran',         category: CommodityCategory.BYPRODUCTS,  iconKey: 'wheat',    displayOrder: 20 },
  { slug: 'ddgs',               nameAr: 'مخلفات تقطير الذرة (DDGS)', nameEn: 'DDGS',         category: CommodityCategory.BYPRODUCTS,  iconKey: 'ddgs',     displayOrder: 21 },
  { slug: 'corn-gluten-feed',   nameAr: 'جلوتين فيد ذرة',     nameEn: 'Corn Gluten Feed',   category: CommodityCategory.BYPRODUCTS,  iconKey: 'ddgs',     displayOrder: 22 },
  { slug: 'corn-flakes',        nameAr: 'ذرة فليكس',          nameEn: 'Corn Flakes',        category: CommodityCategory.BYPRODUCTS,  iconKey: 'corn',     displayOrder: 23 },

  // Oils
  { slug: 'soybean-oil-crude',     nameAr: 'زيت صويا خام',           nameEn: 'Crude Soybean Oil',     category: CommodityCategory.OILS, iconKey: 'soy', displayOrder: 30 },
  { slug: 'soybean-oil-degummed',  nameAr: 'زيت صويا منزوع الصمغ',   nameEn: 'Degummed Soybean Oil',  category: CommodityCategory.OILS, iconKey: 'soy', displayOrder: 31 },
  { slug: 'soybean-oil-refined',   nameAr: 'زيت صويا مكرر',          nameEn: 'Refined Soybean Oil',   category: CommodityCategory.OILS, iconKey: 'soy', displayOrder: 32 },

  // Concentrates / finished feeds
  { slug: 'fattening-starter-23',  nameAr: 'بادئ تسمين 23%',  nameEn: 'Fattening Starter 23%',  category: CommodityCategory.FINISHED_FEED, iconKey: 'feed', displayOrder: 40 },
  { slug: 'fattening-starter-24',  nameAr: 'بادئ تسمين 24%',  nameEn: 'Fattening Starter 24%',  category: CommodityCategory.FINISHED_FEED, iconKey: 'feed', displayOrder: 41 },
  { slug: 'fattening-grower-21',   nameAr: 'نامي تسمين 21%',  nameEn: 'Fattening Grower 21%',   category: CommodityCategory.FINISHED_FEED, iconKey: 'feed', displayOrder: 42 },
  { slug: 'fattening-finisher-19', nameAr: 'ناهي تسمين 19%',  nameEn: 'Fattening Finisher 19%', category: CommodityCategory.FINISHED_FEED, iconKey: 'feed', displayOrder: 43 },
];

/**
 * Maps legacy (pre-unification) slugs to {canonical slug, origin}.
 * Anything not in CANONICAL_COMMODITIES and not in this map is an unknown
 * commodity that needs human review.
 */
export const LEGACY_SLUG_MAP: Record<string, { slug: string; origin: string | null }> = {
  // Corn origins
  'argentine-corn':           { slug: 'yellow-corn',  origin: 'AR' },
  'brazilian-corn':           { slug: 'yellow-corn',  origin: 'BR' },
  'ukrainian-corn':           { slug: 'yellow-corn',  origin: 'UA' },
  'argentine-corn-flakes':    { slug: 'corn-flakes',  origin: 'AR' },

  // Soybean meal origins / dupes
  'soybean-meal-44-local':    { slug: 'soybean-meal-44', origin: 'local' },
  'soybean-meal-46-local':    { slug: 'soybean-meal-46', origin: 'local' },

  // Bran origins
  'local-bran':               { slug: 'wheat-bran',       origin: 'local' },

  // Gluten feed dupes
  'glutofeed':                { slug: 'corn-gluten-feed', origin: null },
  'local-gluten':             { slug: 'corn-gluten-feed', origin: 'local' },

  // Oil slug renames
  'crude-soybean-oil':        { slug: 'soybean-oil-crude',     origin: null },
  'degummed-soybean-oil':     { slug: 'soybean-oil-degummed',  origin: null },
  'refined-soybean-oil':      { slug: 'soybean-oil-refined',   origin: null },

  // Concentrate consolidation
  'super-starter-24':                { slug: 'fattening-starter-24',  origin: null },
  'super-fattening-starter-24':      { slug: 'fattening-starter-24',  origin: null },
  'super-starter-feed-23':           { slug: 'fattening-starter-23',  origin: null },
  'super-fattening-starter-23':      { slug: 'fattening-starter-23',  origin: null },

  'super-fattening-growing-21':      { slug: 'fattening-grower-21',   origin: null },
  'super-growing-feed-21':           { slug: 'fattening-grower-21',   origin: null },
  'super-grower-feed-21':            { slug: 'fattening-grower-21',   origin: null },
  'super-starter-growing-21':        { slug: 'fattening-grower-21',   origin: null },
  'super-starter-grower-21':         { slug: 'fattening-grower-21',   origin: null },
  'super-fattening-grower-21':       { slug: 'fattening-grower-21',   origin: null },
  'starter-growing-feed-21-5':       { slug: 'fattening-grower-21',   origin: null },
  'starter-grower-feed-21-5':        { slug: 'fattening-grower-21',   origin: null },

  'super-finishing-feed-19':         { slug: 'fattening-finisher-19', origin: null },
  'super-fattening-finishing-19':    { slug: 'fattening-finisher-19', origin: null },
  'super-finisher-feed-19':          { slug: 'fattening-finisher-19', origin: null },
  'super-fattening-finisher-19':     { slug: 'fattening-finisher-19', origin: null },
};

export function getCanonicalSlug(slug: string): { slug: string; origin: string | null } | null {
  if (CANONICAL_COMMODITIES.some(c => c.slug === slug)) return { slug, origin: null };
  return LEGACY_SLUG_MAP[slug] ?? null;
}
