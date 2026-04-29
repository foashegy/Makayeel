#!/usr/bin/env node
/**
 * One-off price updater: pulls VetPen / قلم بيطري daily snapshot for 28 Apr 2026
 * and upserts today's (Cairo) prices into the production DB.
 *
 * Source image: VetPen daily price sheet for أسعار خامات أعلاف 28 أبريل 2026
 *
 * Per-source modeling:
 *  - alex-port / damietta-port = imported ports → use Argentine/Brazilian (cheapest landed)
 *  - cairo-wholesale = market wholesale → +1-3% markup
 *  - sadat-city = factory zone → +2-4% markup (delivered to feed mill)
 */
import pg from 'pg';
const { Client } = pg;

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL required'); process.exit(1); }

// Cairo "today" — match API's cairoToday()
const cairoIsoDay = new Date().toLocaleString('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = new Date(`${cairoIsoDay}T00:00:00.000Z`);
console.log('Cairo today:', today.toISOString().slice(0, 10));

// VetPen base prices (28 Apr 2026 snapshot). Mid-point per commodity.
// Per-source multipliers below derive the 4 source prices.
const BASE = {
  'yellow-corn':       13700, // Argentine/Brazilian import landed
  'white-corn':        12900, // not in sheet — local market estimate
  'soybean-meal-46':   25000, // كسب صويا 46% محلي
  'soybean-meal-48':   26000, // not in sheet — typical +1000 over 46%
  'wheat-bran':        12800, // ردة Bran محلي (down 500)
  'barley':             9300, // not in sheet — keep prior range
  'sunflower-meal':    18500, // كسب عباد +36% مستورد
  'ddgs':              17800, // not in sheet — keep prior range
};

// Source multipliers vs. base.
//  Ports = base (imports landed)
//  Wholesale = +1.5% (Cairo distributor markup)
//  Sadat factory zone = +2.5% (delivered to feed mill)
const MULT = {
  'alex-port':       1.000,
  'damietta-port':   0.997,  // slight discount for Damietta
  'cairo-wholesale': 1.015,
  'sadat-city':      1.025,
};

const ROUND = 25; // round to nearest 25 EGP

function round(v) { return Math.round(v / ROUND) * ROUND; }

const c = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
await c.connect();
console.log('connected');

// Resolve commodity + source IDs
const { rows: comms } = await c.query('SELECT id, slug FROM "Commodity" WHERE slug = ANY($1)', [Object.keys(BASE)]);
const { rows: srcs }  = await c.query('SELECT id, slug FROM "Source" WHERE slug = ANY($1)',    [Object.keys(MULT)]);
const cmap = Object.fromEntries(comms.map(r => [r.slug, r.id]));
const smap = Object.fromEntries(srcs.map(r => [r.slug, r.id]));

let updated = 0, inserted = 0;
for (const [cslug, basePrice] of Object.entries(BASE)) {
  const cid = cmap[cslug];
  if (!cid) { console.warn('skip missing commodity', cslug); continue; }
  for (const [sslug, mult] of Object.entries(MULT)) {
    const sid = smap[sslug];
    if (!sid) { console.warn('skip missing source', sslug); continue; }
    const value = round(basePrice * mult);

    // Upsert by (commodityId, sourceId, date)
    const res = await c.query(
      `INSERT INTO "Price" (id, "commodityId", "sourceId", date, value, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("commodityId","sourceId",date)
       DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [cid, sid, today, value],
    );
    if (res.rows[0].inserted) inserted++; else updated++;
  }
}

console.log(`done: ${inserted} inserted, ${updated} updated`);

// Sanity: print today's snapshot
const { rows: snap } = await c.query(
  `SELECT c.slug AS c, s.slug AS s, p.value
   FROM "Price" p
   JOIN "Commodity" c ON c.id = p."commodityId"
   JOIN "Source"   s ON s.id = p."sourceId"
   WHERE p.date = $1
   ORDER BY c."displayOrder", s.slug`,
  [today],
);
console.log('\n  today snapshot:');
for (const r of snap) console.log(`   ${r.c.padEnd(20)} @ ${r.s.padEnd(18)} = ${r.value}`);
await c.end();
