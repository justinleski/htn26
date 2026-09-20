-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(18,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "attribution" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPerformance" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "messaging" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "purchases" INTEGER NOT NULL,
    "spend" DECIMAL(18,4) NOT NULL,
    "attributedRevenue" DECIMAL(18,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "source" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "supportingSourceIds" TEXT[],
    "observedMetrics" JSONB NOT NULL,
    "limitations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "hooks" TEXT[],
    "captions" TEXT[],
    "variants" JSONB NOT NULL,
    "supportingSourceIds" TEXT[],
    "validationResults" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorDetails" TEXT,
    "campaignId" TEXT,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_shopDomain_key" ON "Merchant"("shopDomain");

-- CreateIndex
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_merchantId_shopifyId_key" ON "Product"("merchantId", "shopifyId");

-- CreateIndex
CREATE INDEX "Review_merchantId_productId_idx" ON "Review"("merchantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_merchantId_sourceId_key" ON "Review"("merchantId", "sourceId");

-- CreateIndex
CREATE INDEX "AdPerformance_merchantId_productId_idx" ON "AdPerformance"("merchantId", "productId");

-- CreateIndex
CREATE INDEX "AdPerformance_merchantId_campaignId_idx" ON "AdPerformance"("merchantId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AdPerformance_merchantId_sourceId_key" ON "AdPerformance"("merchantId", "sourceId");

-- CreateIndex
CREATE INDEX "Insight_merchantId_productId_idx" ON "Insight"("merchantId", "productId");

-- CreateIndex
CREATE INDEX "Campaign_merchantId_productId_idx" ON "Campaign"("merchantId", "productId");

-- CreateIndex
CREATE INDEX "GenerationRun_merchantId_status_idx" ON "GenerationRun"("merchantId", "status");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
