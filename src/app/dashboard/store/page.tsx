import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";

export default async function StoreSettings() {
  const creator = await requireCreator();
  const products = await db.product.findMany({
    where: { creatorId: creator.id, published: true, archived: false },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return (
    <div>
      <PageHeader title="Your store" subtitle="How your page looks to followers. Changes show in the preview right away." />
      <ProfileForm creator={creator} products={products} />
    </div>
  );
}
