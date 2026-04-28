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
  'pnpm --filter @makayeel/db migrate:deploy',
];

if (process.env.SEED_DB === '1') {
  steps.push('pnpm --filter @makayeel/db seed');
}

steps.push('pnpm --filter @makayeel/web build');

for (const cmd of steps) {
  console.log(`\n[netlify-build] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}
