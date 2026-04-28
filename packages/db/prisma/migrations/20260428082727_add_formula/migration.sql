-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalTons" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "herdSize" INTEGER NOT NULL DEFAULT 0,
    "kgPerHeadPerDay" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "fcr" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "outputPricePerKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "outputKind" TEXT NOT NULL DEFAULT 'meat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Formula_userId_idx" ON "Formula"("userId");

-- AddForeignKey
ALTER TABLE "Formula" ADD CONSTRAINT "Formula_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
