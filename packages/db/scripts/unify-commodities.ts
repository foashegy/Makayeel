/**
 * One-shot data migration — fold legacy commodity slugs into canonical ones.
 *
 * Wraps the shared `unifyCommodities()` logic; usable against any DATABASE_URL.
 *
 * Usage:
 *   DRY=1 pnpm --filter @makayeel/db tsx scripts/unify-commodities.ts   # preview
 *   pnpm --filter @makayeel/db tsx scripts/unify-commodities.ts         # apply
 */
import { PrismaClient } from '@prisma/client';
import { unifyCommodities } from '../src/unify-commodities';

const prisma = new PrismaClient();
const mode = process.env.DRY === '1' ? 'dry' : 'live';

async function main() {
  console.log(`Mode: ${mode === 'dry' ? 'DRY RUN (no writes)' : 'LIVE — will modify DB'}`);
  const report = await unifyCommodities(prisma, mode);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
