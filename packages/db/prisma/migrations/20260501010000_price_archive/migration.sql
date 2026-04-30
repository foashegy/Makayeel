-- Add soft-delete columns to Price.
ALTER TABLE "Price" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Price" ADD COLUMN "archivedReason" TEXT;

-- Index for read-path filtering.
CREATE INDEX "Price_archivedAt_idx" ON "Price"("archivedAt");
