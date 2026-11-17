-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('NONE', 'HELD', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "affiliateDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "affiliateNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "affiliateOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "affiliatePercent" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "affiliatePercent" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "affiliateId" TEXT,
ADD COLUMN     "commissionCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commissionNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "commissionPaidAt" TIMESTAMP(3),
ADD COLUMN     "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "commissionTransferId" TEXT;

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateMessage" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_code_key" ON "Affiliate"("code");

-- CreateIndex
CREATE INDEX "Affiliate_memberId_idx" ON "Affiliate"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_creatorId_memberId_key" ON "Affiliate"("creatorId", "memberId");

-- CreateIndex
CREATE INDEX "AffiliateMessage_creatorId_createdAt_idx" ON "AffiliateMessage"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_affiliateId_idx" ON "Order"("affiliateId");

-- CreateIndex
CREATE INDEX "Order_commissionStatus_paidAt_idx" ON "Order"("commissionStatus", "paidAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMessage" ADD CONSTRAINT "AffiliateMessage_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
