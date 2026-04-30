-- CreateTable
CREATE TABLE "PriceAudit" (
    "id" TEXT NOT NULL,
    "priceId" TEXT,
    "commoditySlug" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "oldValue" DECIMAL(12,2),
    "newValue" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "bucketKey" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("bucketKey")
);

-- CreateTable
CREATE TABLE "VisionQuota" (
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "used" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionQuota_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "PriceAudit_commoditySlug_date_idx" ON "PriceAudit"("commoditySlug", "date");

-- CreateIndex
CREATE INDEX "PriceAudit_source_createdAt_idx" ON "PriceAudit"("source", "createdAt");

-- CreateIndex
CREATE INDEX "PriceAudit_actorUserId_idx" ON "PriceAudit"("actorUserId");

-- CreateIndex
CREATE INDEX "VisionQuota_userId_date_idx" ON "VisionQuota"("userId", "date");
