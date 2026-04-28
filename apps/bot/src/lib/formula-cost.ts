import { prisma } from '@makayeel/db';
import { cairoToday, cairoDaysAgo } from './queries';

export interface FormulaItemRow {
  commoditySlug: string;
  percent: number;
}

export interface FormulaCostResult {
  formulaId: string;
  formulaName: string;
  costPerTonToday: number;
  costPerTonYesterday: number | null;
  deltaPct: number | null;
  missingSlugs: string[]; // commodities with no today price
}

/**
 * Build a map of commoditySlug → cheapest price-per-ton on the given date.
 * Returns numbers (Decimals coerced) keyed by commodity slug.
 */
async function cheapestPricesByDay(date: Date): Promise<Map<string, number>> {
  const rows = await prisma.price.findMany({
    where: { date },
    select: { commodity: { select: { slug: true } }, value: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = Number(r.value);
    const slug = r.commodity.slug;
    const cur = map.get(slug);
    if (cur === undefined || v < cur) map.set(slug, v);
  }
  return map;
}

export interface DailyPriceMaps {
  today: Map<string, number>;
  yesterday: Map<string, number>;
}

/**
 * Fetch today's and yesterday's cheapest-per-commodity price maps in one shot.
 * Pass the result into computeUserFormulaCosts(..., maps) when iterating
 * over many users (e.g. the daily digest cron) to avoid an N+1.
 */
export async function getDailyPriceMaps(): Promise<DailyPriceMaps> {
  const [today, yesterday] = await Promise.all([
    cheapestPricesByDay(cairoToday()),
    cheapestPricesByDay(cairoDaysAgo(1)),
  ]);
  return { today, yesterday };
}

function computeCost(items: FormulaItemRow[], priceBySlug: Map<string, number>) {
  let cost = 0;
  const missing: string[] = [];
  for (const it of items) {
    const price = priceBySlug.get(it.commoditySlug);
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      missing.push(it.commoditySlug);
      continue;
    }
    cost += price * (it.percent / 100);
  }
  return { cost, missing };
}

function isFormulaItemArray(value: unknown): value is FormulaItemRow[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (v) =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as Record<string, unknown>).commoditySlug === 'string' &&
      typeof (v as Record<string, unknown>).percent === 'number',
  );
}

/**
 * Compute today's cost (and yesterday's, for delta) for every formula owned
 * by `userId`. Returns at most one result per formula. Costs are EGP/ton.
 *
 * Accepts pre-fetched price maps to avoid N+1 when called in a loop
 * (e.g. the daily digest cron). When omitted, fetches them inline —
 * fine for one-off calls like the /cost command.
 */
export async function computeUserFormulaCosts(
  userId: string,
  maps?: DailyPriceMaps,
): Promise<FormulaCostResult[]> {
  const formulas = await prisma.formula.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (formulas.length === 0) return [];

  const { today: todayPrices, yesterday: yesterdayPrices } =
    maps ?? (await getDailyPriceMaps());

  const out: FormulaCostResult[] = [];
  for (const f of formulas) {
    if (!isFormulaItemArray(f.items)) continue;
    const today = computeCost(f.items, todayPrices);
    const yesterday = computeCost(f.items, yesterdayPrices);
    const yCost = yesterday.missing.length === 0 ? yesterday.cost : null;
    const deltaPct =
      yCost !== null && yCost > 0 ? ((today.cost - yCost) / yCost) * 100 : null;
    out.push({
      formulaId: f.id,
      formulaName: f.name,
      costPerTonToday: today.cost,
      costPerTonYesterday: yCost,
      deltaPct,
      missingSlugs: today.missing,
    });
  }
  return out;
}
