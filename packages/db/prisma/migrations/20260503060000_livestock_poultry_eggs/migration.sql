-- Add LIVESTOCK, POULTRY, EGGS to CommodityCategory enum + seed the
-- 8 new canonical commodities (live broilers, chicks, egg cartons).
--
-- All steps idempotent so the migration is safe to re-run.

-- 1) Enum values (PG 9.6+ supports IF NOT EXISTS, no transaction issue on PG 12+).
ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'LIVESTOCK';
ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'POULTRY';
ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'EGGS';

-- 2) Seed canonical commodities. Use ON CONFLICT (slug) DO NOTHING — safe to
-- re-run. ID generation: since Commodity.id uses cuid() at app level (no DB
-- default), we generate one inline with a deterministic random hex prefix
-- using gen_random_uuid()::text — Neon ships pgcrypto preinstalled.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN VALUES
    ('live-broiler-white',  'فراخ بيضاء حية',   'Live White Broiler',    'POULTRY', 'EGP/kg',     'chicken', 50),
    ('live-broiler-sasso',  'فراخ ساسو حية',    'Live Sasso Broiler',    'POULTRY', 'EGP/kg',     'chicken', 51),
    ('live-broiler-baladi', 'فراخ بلدي حية',    'Live Baladi Broiler',   'POULTRY', 'EGP/kg',     'chicken', 52),
    ('chick-white',         'كتكوت أبيض',        'White Chick',           'POULTRY', 'EGP/chick',  'chick',   53),
    ('chick-sasso',         'كتكوت ساسو',        'Sasso Chick',           'POULTRY', 'EGP/chick',  'chick',   54),
    ('eggs-white-carton',   'كرتونة بيض أبيض',   'White Eggs (Carton)',   'EGGS',    'EGP/carton', 'egg',     60),
    ('eggs-red-carton',     'كرتونة بيض أحمر',   'Red Eggs (Carton)',     'EGGS',    'EGP/carton', 'egg',     61),
    ('eggs-baladi-carton',  'كرتونة بيض بلدي',   'Baladi Eggs (Carton)',  'EGGS',    'EGP/carton', 'egg',     62)
  AS t(slug, nameAr, nameEn, category, unit, iconKey, displayOrder)
  LOOP
    INSERT INTO "Commodity" (id, slug, "nameAr", "nameEn", category, unit, "iconKey", "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES (
      replace(gen_random_uuid()::text, '-', ''),
      rec.slug, rec.nameAr, rec.nameEn, rec.category::"CommodityCategory", rec.unit, rec.iconKey, rec.displayOrder, true, now(), now()
    )
    ON CONFLICT (slug) DO NOTHING;
  END LOOP;
END $$;
