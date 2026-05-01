-- Add origin column to Price + replace the (commodityId, sourceId, date) unique
-- with one that includes origin AND treats archived rows as exempt (so audit
-- copies don't conflict with live ones at the same key).
--
-- All steps are idempotent so the migration is safe to re-run.

ALTER TABLE "Price" ADD COLUMN IF NOT EXISTS "origin" TEXT;

-- Drop possible legacy names of the original unique key. Prisma might have
-- created it as either a constraint or a plain index depending on the version
-- used at init. Try both, ignoring errors via IF EXISTS.
DROP INDEX IF EXISTS "Price_commodityId_sourceId_date_key";
ALTER TABLE "Price" DROP CONSTRAINT IF EXISTS "Price_commodityId_sourceId_date_key";

-- Functional index: treats origin=NULL as the literal '__null__' so two rows
-- with origin=NULL on the same (commodity, source, date) collide. Works on
-- PG 11+ — no `NULLS NOT DISTINCT` (PG 15+) needed.
DROP INDEX IF EXISTS "Price_commodityId_sourceId_date_origin_key";
CREATE UNIQUE INDEX "Price_commodityId_sourceId_date_origin_key"
  ON "Price" ("commodityId", "sourceId", "date", (COALESCE("origin", '__null__')))
  WHERE "archivedAt" IS NULL;
