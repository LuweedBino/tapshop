import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/format";
import { canSell } from "@/lib/orders";
import { designOf } from "@/lib/design";
import { Avatar, defaultCta, priceLabel, StoreFooter, StoreShell } from "@/components/Storefront";
import { BuyForm } from "@/components/BuyForm";

async function load(handle: string, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { creator: true } });
  if (!product || !product.published || product.type === "LINK" || product.creator.handle !== handle.toLowerCase() || product.creator.pausedAt) return null;
  return product;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; productId: string }> }): Promise<Metadata> {
  const { handle, productId } = await params;
  const p = await load(handle, productId);
  return p ? { title: `${p.title} | ${p.creator.displayName}`, description: p.subtitle || undefined } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string; productId: string }> }) {
  const { handle, productId } = await params;
  const product = await load(handle, productId);
  if (!product) notFound();
  const { creator } = product;
  const cover = fileUrl(product.coverKey);
  const paid = product.type === "DIGITAL" && product.priceCents > 0;
  const cta = paid ? `${defaultCta(product)} · ${priceLabel(product)}` : defaultCta(product);

  return (
    <StoreShell design={designOf(creator)} fadeAt={260}>
      <main className="mx-auto max-w-md px-4 pt-5">
        <Link href={`/${creator.handle}`} className="flex items-center gap-2.5 text-sm font-semibold">
          <span aria-hidden>←</span>
          <Avatar creator={creator} size={32} />
          {creator.displayName}
        </Link>

        <article className="mt-5 overflow-hidden rounded-[calc(var(--card-radius)*1.5)] border border-[var(--card-border)] bg-[var(--card)] text-[var(--card-text)] shadow-sm">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-[4/3] w-full object-cover" />
          )}
          <div className="p-5">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{product.title}</h1>
            {product.subtitle && <p className="mt-1.5 text-[var(--card-muted)]">{product.subtitle}</p>}
            <p className="mt-3 text-2xl font-black text-[var(--accent)]">{priceLabel(product)}</p>
            {product.description && <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed opacity-90">{product.description}</div>}
            <div className="mt-6">
              <BuyForm
                productId={product.id}
                kind={product.type === "LEAD_MAGNET" ? "optin" : "buy"}
                cta={cta}
                disabledReason={paid && !canSell(creator) ? "This product isn't available for purchase yet." : undefined}
              />
              {paid && <p className="mt-3 text-center text-xs text-[var(--card-muted)]">Secure checkout by Stripe. Apple Pay and Google Pay supported.</p>}
            </div>
          </div>
        </article>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
