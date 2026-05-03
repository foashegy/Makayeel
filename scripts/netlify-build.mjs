#!/usr/bin/env node
import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('[netlify-build] DATABASE_URL not set in build env — aborting');
  process.exit(1);
}

const steps = [
  'corepack enable',
  'corepack prepare pnpm@10.33.0 --activate',
  'pnpm install --frozen-lockfile',
  'pnpm --filter @makayeel/db generate',
];

// One-shot recovery: if a previous build failed mid-migration, Prisma marks
// the row in `_prisma_migrations` as failed and refuses subsequent deploys.
// Mark the affected migration as rolled-back so the now-idempotent SQL re-runs.
// `migrate resolve` errors if the migration is in any other state — that's
// fine, we just swallow it.
const RECOVER_MIGRATIONS = [
  '20260501170000_price_origin',
  '20260503060000_livestock_poultry_eggs',
  '20260503060100_seed_livestock_commodities',
];
for (const m of RECOVER_MIGRATIONS) {
  steps.push(
    `pnpm --filter @makayeel/db exec prisma migrate resolve --rolled-back ${m} || echo "[netlify-build] ${m} not in failed state, continuing"`,
  );
}

steps.push('pnpm --filter @makayeel/db migrate:deploy');

if (process.env.SEED_DB === '1') {
  steps.push('pnpm --filter @makayeel/db seed');
}

steps.push('pnpm --filter @makayeel/web build');

for (const cmd of steps) {
  console.log(`\n[netlify-build] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}
