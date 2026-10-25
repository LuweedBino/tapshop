import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { designOf } from "@/lib/design";
import { ProductCard, StoreFooter, StoreHeader, StoreShell } from "@/components/Storefront";

async function load(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    include: { products: { where: { published: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
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
        <section className="mt-8 space-y-3 px-4">
          {creator.products.map((p) => (
            <ProductCard key={p.id} product={p} handle={creator.handle} layout={design.layout} />
          ))}
          {creator.products.length === 0 && <p className="py-10 text-center text-sm text-[var(--page-muted)]">Nothing here yet. Check back soon.</p>}
        </section>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
