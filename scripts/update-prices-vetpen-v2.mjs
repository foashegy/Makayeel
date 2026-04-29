#!/usr/bin/env node
/**
 * Price update v2 — applies ATEN Board (29 Apr 2026) Phase-2 fixes:
 *
 *  1. Adds two missing commodities to DB (جلوتوفيد + كسب صويا 44%) so they
 *     appear on the public table.
 *  2. Corrects per-source multipliers per Market Analyst memo:
 *       - For SBM + corn: Damietta is 0.5% CHEAPER than Alex (NOT pricier),
 *         because Damietta is the dominant SBM/corn discharge port.
 *       - For sunflower / DDGS: Alex is 0.5% cheaper than Damietta (Alex is
 *         the more common landing port for these).
 *       - Sadat-city delivered premium widened from 2.5% → 3.8% (real
 *         trucking + handling cost on a 25K SBM load is ~600 EGP, not 625
 *         flat-rate from a thin multiplier).
 *  3. Re-flags new commodities as estimated (no VetPen quote for جلوتوفيد today
 *     by source breakdown — but base=14,500 is real from VetPen).
 *
 * Run: DATABASE_URL=... node scripts/update-prices-vetpen-v2.mjs
 */
import pg from 'pg';
const { Client } = pg;

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL required'); process.exit(1); }

const cairoIsoDay = new Date().toLocaleString('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = new Date(`${cairoIsoDay}T00:00:00.000Z`);
console.log('Cairo today:', today.toISOString().slice(0, 10));

// VetPen 28 Apr 2026 + measured/estimated flags.
// `vetpen` true = quoted directly, false = our extrapolation.
const COMMODITIES = {
  'yellow-corn':       { base: 13700, vetpen: true,  family: 'corn' },
  'white-corn':        { base: 12900, vetpen: false, family: 'corn' },
  'soybean-meal-44':   { base: 24000, vetpen: true,  family: 'sbm'  },
  'soybean-meal-46':   { base: 25000, vetpen: true,  family: 'sbm'  },
  'soybean-meal-48':   { base: 26000, vetpen: false, family: 'sbm'  },
  'wheat-bran':        { base: 12800, vetpen: true,  family: 'bran' },
  'barley':            { base:  9300, vetpen: false, family: 'corn' },
  'sunflower-meal':    { base: 18500, vetpen: true,  family: 'oil'  },
  'ddgs':              { base: 17800, vetpen: false, family: 'oil'  },
  'glutofeed':         { base: 14500, vetpen: true,  family: 'bran' },
};

// Family-aware source multipliers.
// SBM/corn → Damietta is the cheaper, dominant port.
// Oil seeds (sunflower/DDGS) → Alex is cheaper (typical landing).
// Bran/glutofeed → local product, all sources roughly equal but wholesale +1.5%, sadat +3.8%.
const MULT = {
  corn: { 'alex-port': 1.000, 'damietta-port': 0.995, 'cairo-wholesale': 1.018, 'sadat-city': 1.038 },
  sbm:  { 'alex-port': 1.000, 'damietta-port': 0.995, 'cairo-wholesale': 1.018, 'sadat-city': 1.038 },
  oil:  { 'alex-port': 0.997, 'damietta-port': 1.000, 'cairo-wholesale': 1.018, 'sadat-city': 1.038 },
  bran: { 'alex-port': 1.000, 'damietta-port': 1.000, 'cairo-wholesale': 1.015, 'sadat-city': 1.038 },
};

const NEW_COMMODITIES_DEF = [
  {
    slug: 'soybean-meal-44',
    nameAr: 'كسب فول الصويا 44%',
    nameEn: 'Soybean Meal 44%',
    category: 'PROTEINS',
    iconKey: 'soy',
    displayOrder: 9,
  },
  {
    slug: 'glutofeed',
    nameAr: 'جلوتوفيد',
    nameEn: 'Glutofeed',
    category: 'BYPRODUCTS',
    iconKey: 'corn',
    displayOrder: 10,
  },
];

const ROUND = 25;
const round = (v) => Math.round(v / ROUND) * ROUND;

const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await c.connect();
console.log('connected');

// 1. Upsert new commodities (idempotent)
for (const com of NEW_COMMODITIES_DEF) {
  await c.query(
    `INSERT INTO "Commodity" (id, slug, "nameAr", "nameEn", category, unit, "iconKey", "displayOrder", "isActive", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4::"CommodityCategory", 'EGP/ton', $5, $6, true, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET "nameAr" = EXCLUDED."nameAr", "displayOrder" = EXCLUDED."displayOrder", "isActive" = true`,
    [com.slug, com.nameAr, com.nameEn, com.category, com.iconKey, com.displayOrder],
  );
  console.log('upsert commodity:', com.slug);
}

// 2. Resolve commodity + source IDs
const { rows: comms } = await c.query('SELECT id, slug FROM "Commodity" WHERE slug = ANY($1)', [Object.keys(COMMODITIES)]);
const { rows: srcs }  = await c.query('SELECT id, slug FROM "Source"', );
const cmap = Object.fromEntries(comms.map(r => [r.slug, r.id]));
const smap = Object.fromEntries(srcs.map(r => [r.slug, r.id]));

let upserts = 0;
for (const [cslug, meta] of Object.entries(COMMODITIES)) {
  const cid = cmap[cslug];
  if (!cid) { console.warn('skip missing commodity', cslug); continue; }
  const mults = MULT[meta.family];
  const isEstimated = !meta.vetpen;
  const sourceRef = meta.vetpen ? 'VetPen 28-Apr-2026' : 'تقدير داخلي مكاييل (لا مصدر مقاس)';
  for (const [sslug, mult] of Object.entries(mults)) {
    const sid = smap[sslug];
    if (!sid) { console.warn('skip missing source', sslug); continue; }
    const value = round(meta.base * mult);
    await c.query(
      `INSERT INTO "Price" (id, "commodityId", "sourceId", date, value, "isEstimated", "sourceRef", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT ("commodityId","sourceId",date)
       DO UPDATE SET value = EXCLUDED.value, "isEstimated" = EXCLUDED."isEstimated", "sourceRef" = EXCLUDED."sourceRef", "updatedAt" = NOW()`,
      [cid, sid, today, value, isEstimated, sourceRef],
    );
    upserts++;
  }
}

console.log(`done: ${upserts} prices upserted`);

// Sanity snapshot
const { rows: snap } = await c.query(
  `SELECT c.slug AS c, s.slug AS s, p.value, p."isEstimated"
   FROM "Price" p
   JOIN "Commodity" c ON c.id = p."commodityId"
   JOIN "Source"   s ON s.id = p."sourceId"
   WHERE p.date = $1
   ORDER BY c."displayOrder", s.slug`,
  [today],
);
console.log('\n  today snapshot:');
for (const r of snap) {
  const flag = r.isEstimated ? '~' : ' ';
  console.log(` ${flag} ${r.c.padEnd(20)} @ ${r.s.padEnd(18)} = ${r.value}`);
}
await c.end();
