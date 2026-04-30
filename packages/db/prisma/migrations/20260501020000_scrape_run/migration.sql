-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL,
    "siteSlug" TEXT NOT NULL,
    "pageHint" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "productsRead" INTEGER NOT NULL,
    "pricesWritten" INTEGER NOT NULL,
    "createdSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScrapeRun_siteSlug_startedAt_idx" ON "ScrapeRun"("siteSlug", "startedAt");
CREATE INDEX "ScrapeRun_startedAt_idx" ON "ScrapeRun"("startedAt");
