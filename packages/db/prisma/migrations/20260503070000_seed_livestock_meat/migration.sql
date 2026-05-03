-- Seed live livestock canonical commodities (cattle, buffalo, sheep).
-- LIVESTOCK enum value already added in 20260503060000_livestock_poultry_eggs,
-- so this migration just inserts the rows.
-- Idempotent via ON CONFLICT (slug) DO NOTHING.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('live-cattle',  'بقري قائم',   'Live Cattle (Beef)', 'LIVESTOCK', 'EGP/kg', 'cow',     70),
    ('live-buffalo', 'جاموسي قائم', 'Live Buffalo',        'LIVESTOCK', 'EGP/kg', 'buffalo', 71),
    ('live-sheep',   'ضاني قائم',   'Live Sheep',          'LIVESTOCK', 'EGP/kg', 'sheep',   72)
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
