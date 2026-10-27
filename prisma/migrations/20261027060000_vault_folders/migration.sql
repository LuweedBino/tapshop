-- CreateTable
CREATE TABLE "VaultFolder" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultFolder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "VaultItem" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "VaultFolder_creatorId_idx" ON "VaultFolder"("creatorId");

-- CreateIndex
CREATE INDEX "VaultItem_folderId_idx" ON "VaultItem"("folderId");

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "VaultFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFolder" ADD CONSTRAINT "VaultFolder_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
