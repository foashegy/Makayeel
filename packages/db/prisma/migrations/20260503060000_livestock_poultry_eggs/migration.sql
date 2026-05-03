-- Add LIVESTOCK, POULTRY, EGGS to CommodityCategory enum.
-- Postgres requires new enum values to be COMMITTED before they can be
-- used in DML — so the seed INSERTs live in a separate follow-up migration.
-- All steps idempotent so the migration is safe to re-run.

ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'LIVESTOCK';
ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'POULTRY';
ALTER TYPE "CommodityCategory" ADD VALUE IF NOT EXISTS 'EGGS';
