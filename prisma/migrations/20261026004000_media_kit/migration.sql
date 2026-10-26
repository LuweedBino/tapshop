-- CreateTable
CREATE TABLE "MediaKit" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandInquiry" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "budget" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaKit_creatorId_key" ON "MediaKit"("creatorId");

-- CreateIndex
CREATE INDEX "BrandInquiry_creatorId_createdAt_idx" ON "BrandInquiry"("creatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "MediaKit" ADD CONSTRAINT "MediaKit_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandInquiry" ADD CONSTRAINT "BrandInquiry_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
