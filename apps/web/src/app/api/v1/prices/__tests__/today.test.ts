import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@makayeel/db';
import { GET } from '../today/route';

/**
 * Integration-style test. Uses the real DB — CI spins up a fresh Postgres
 * via the services block and runs `db:migrate` + `db:seed` before tests.
 * Locally: make sure docker-compose postgres is up and db is seeded.
 */
describe('GET /api/v1/prices/today', () => {
  beforeAll(async () => {
    // Sanity check: must have at least one commodity, else the test env isn't seeded.
    const count = await prisma.commodity.count();
    if (count === 0) {
      throw new Error('DB not seeded — run `pnpm db:seed` first');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns success + rows array', async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('date');
    expect(body.data).toHaveProperty('prices');
    expect(Array.isArray(body.data.prices)).toBe(true);
  });

  it('each row carries commodity + source identifiers and a numeric price', async () => {
    const res = await GET();
    const body = await res.json();
    if (body.data.prices.length === 0) return; // empty DB day — ok
    const row = body.data.prices[0];
    expect(row).toHaveProperty('commoditySlug');
    expect(row).toHaveProperty('sourceSlug');
    expect(typeof row.value).toBe('number');
    expect(row.value).toBeGreaterThan(0);
  });
});
