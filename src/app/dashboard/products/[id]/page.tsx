import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const creator = await requireCreator();
  const [product, pages] = await Promise.all([
    db.product.findFirst({ where: { id: (await params).id, creatorId: creator.id, archived: false } }),
    db.page.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!product) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit" subtitle={product.title} />
      <ProductForm product={product} pages={pages} />
    </div>
  );
}
