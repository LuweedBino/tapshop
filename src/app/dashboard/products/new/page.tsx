import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  const { type, page } = await searchParams;
  const creator = await requireCreator();
  const pages = await db.page.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "asc" } });
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add to your store" />
      <ProductForm
        initialType={type === "LEAD_MAGNET" || type === "LINK" || type === "AFFILIATE" ? type : "DIGITAL"}
        pages={pages}
        initialPageId={pages.some((p) => p.id === page) ? page : undefined}
      />
    </div>
  );
}
