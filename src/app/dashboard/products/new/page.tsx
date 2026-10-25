import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add to your store" />
      <ProductForm initialType={type === "LEAD_MAGNET" || type === "LINK" || type === "AFFILIATE" ? type : "DIGITAL"} />
    </div>
  );
}
