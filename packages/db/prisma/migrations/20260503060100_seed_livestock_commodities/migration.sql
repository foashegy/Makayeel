-- Seed canonical livestock/poultry/egg commodities.
-- Idempotent via ON CONFLICT DO NOTHING. Lives in its own migration so the
-- enum-add migration commits first (Postgres rule: new enum values can't be
-- used in the same transaction they're declared).
--
-- ID: Commodity.id is cuid() at the Prisma client layer (no DB default), so
-- here we mint a unique 25-char string from md5(random+clock) — works
-- without pgcrypto / uuid extensions on stock Postgres / Neon.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('live-broiler-white',  'فراخ بيضاء حية',   'Live White Broiler',    'POULTRY', 'EGP/kg',     'chicken', 50),
    ('live-broiler-sasso',  'فراخ ساسو حية',    'Live Sasso Broiler',    'POULTRY', 'EGP/kg',     'chicken', 51),
    ('live-broiler-baladi', 'فراخ بلدي حية',    'Live Baladi Broiler',   'POULTRY', 'EGP/kg',     'chicken', 52),
    ('chick-white',         'كتكوت أبيض',        'White Chick',           'POULTRY', 'EGP/chick',  'chick',   53),
    ('chick-sasso',         'كتكوت ساسو',        'Sasso Chick',           'POULTRY', 'EGP/chick',  'chick',   54),
    ('eggs-white-carton',   'كرتونة بيض أبيض',   'White Eggs (Carton)',   'EGGS',    'EGP/carton', 'egg',     60),
    ('eggs-red-carton',     'كرتونة بيض أحمر',   'Red Eggs (Carton)',     'EGGS',    'EGP/carton', 'egg',     61),
    ('eggs-baladi-carton',  'كرتونة بيض بلدي',   'Baladi Eggs (Carton)',  'EGGS',    'EGP/carton', 'egg',     62)
  ) AS t(slug, name_ar, name_en, category, unit, icon_key, display_order)
  LOOP
    INSERT INTO "Commodity" (id, slug, "nameAr", "nameEn", category, unit, "iconKey", "displayOrder", "isActive", "createdAt", "updatedAt")
    VALUES (
      'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
      rec.slug, rec.name_ar, rec.name_en, rec.category::"CommodityCategory", rec.unit, rec.icon_key, rec.display_order, true, now(), now()
    )
    ON CONFLICT (slug) DO NOTHING;
  END LOOP;
END $$;
