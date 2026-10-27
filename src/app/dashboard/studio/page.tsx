import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudioFrame } from "@/components/studio/StudioFrame";

export const metadata = { title: "Studio" };

export default async function StudioPage() {
  const creator = await requireCreator();
  const [products, vault, folders] = await Promise.all([
    db.product.findMany({
      where: { creatorId: creator.id, archived: false, type: { not: "LINK" } },
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    }),
    db.vaultItem.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, kind: true, size: true, contentType: true, source: true, folderId: true, createdAt: true },
    }),
    db.vaultFolder.findMany({ where: { creatorId: creator.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <StudioFrame products={products} vault={vault.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))} folders={folders} />;
}
