import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudioFrame } from "@/components/studio/StudioFrame";

export const metadata = { title: "Studio" };

export default async function StudioPage() {
  const creator = await requireCreator();
  const products = await db.product.findMany({
    where: { creatorId: creator.id, archived: false, type: { not: "LINK" } },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });
  return <StudioFrame products={products} />;
}
