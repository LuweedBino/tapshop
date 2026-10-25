-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "bannerKey" TEXT,
ADD COLUMN     "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
ADD COLUMN     "font" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "layout" TEXT NOT NULL DEFAULT 'card',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'soft';
