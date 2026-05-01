-- Add origin to Price + adjust unique constraint:
--   1. Include `origin` in the key so AR/BR/UA/local variants don't collide.
--   2. Make the unique a PARTIAL index over `archivedAt IS NULL` so archived
--      rows (kept for audit) don't conflict with live ones at the same key —
--      important for the legacy-commodity unification, which archives losers
--      after repointing them to the canonical commodity.
--   3. NULLS NOT DISTINCT so origin=NULL collides with origin=NULL on live
--      rows (otherwise scrapers could double-write).

ALTER TABLE "Price" ADD COLUMN "origin" TEXT;

-- The original key was created as a unique INDEX (not a CONSTRAINT) in
-- 20260418140057_init, so drop the index instead of the constraint.
DROP INDEX "Price_commodityId_sourceId_date_key";

-- Use COALESCE-based functional index instead of `NULLS NOT DISTINCT` so this
-- works on PG 11+ (Neon may pin older versions). Treats origin=NULL as the
-- literal '__null__', so two rows with origin=NULL on the same key do collide.
CREATE UNIQUE INDEX "Price_commodityId_sourceId_date_origin_key"
  ON "Price" ("commodityId", "sourceId", "date", (COALESCE("origin", '__null__')))
  WHERE "archivedAt" IS NULL;
