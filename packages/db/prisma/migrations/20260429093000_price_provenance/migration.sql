-- Add provenance fields to Price
ALTER TABLE "Price"
  ADD COLUMN "isEstimated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sourceRef"   TEXT;

-- Backfill: VetPen reference for measured commodities (28 Apr 2026)
UPDATE "Price" SET "sourceRef" = 'VetPen 28-Apr-2026'
WHERE "date" = '2026-04-29'
  AND "commodityId" IN (SELECT id FROM "Commodity" WHERE slug IN (
    'yellow-corn','soybean-meal-46','wheat-bran','sunflower-meal'
  ));

-- Backfill: estimated for commodities not on VetPen (today only)
UPDATE "Price"
SET "isEstimated" = true,
    "sourceRef"   = 'تقدير داخلي مكاييل (لا مصدر مقاس)'
WHERE "date" = '2026-04-29'
  AND "commodityId" IN (SELECT id FROM "Commodity" WHERE slug IN (
    'white-corn','soybean-meal-48','barley','ddgs'
  ));
