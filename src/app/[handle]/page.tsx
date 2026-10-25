import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { designOf } from "@/lib/design";
import { StoreFooter, StoreHeader, StoreProducts, StoreShell } from "@/components/Storefront";

async function load(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    // Products on an extra page show only there, not on the main store.
    include: { products: { where: { published: true, pageId: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const creator = await load((await params).handle);
  return creator && !creator.pausedAt ? { title: `${creator.displayName} | TapShop`, description: creator.bio || undefined } : {};
}

export default async function StorePage({ params }: { params: Promise<{ handle: string }> }) {
  const creator = await load((await params).handle);
  if (!creator || creator.pausedAt) notFound();
  const design = designOf(creator);
  return (
    <StoreShell design={design}>
      <main className="mx-auto max-w-md">
        <StoreHeader creator={creator} />
        <StoreProducts products={creator.products} handle={creator.handle} layout={design.layout} />
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
