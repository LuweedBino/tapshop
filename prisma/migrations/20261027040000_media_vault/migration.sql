-- CreateTable
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "size" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "source" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultItem_key_key" ON "VaultItem"("key");

-- CreateIndex
CREATE INDEX "VaultItem_creatorId_createdAt_idx" ON "VaultItem"("creatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
