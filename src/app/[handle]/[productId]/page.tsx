import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/format";
import { canSell } from "@/lib/orders";
import { designOf } from "@/lib/design";
import { Avatar, defaultCta, priceLabel, StoreFooter, StoreHeader, StoreProducts, StoreShell } from "@/components/Storefront";
import { BuyForm } from "@/components/BuyForm";
import { CopyCode } from "@/components/CopyCode";
import { parseExtras, videoEmbed } from "@/lib/affiliate";
import { KIT_SLUG, OLD_KIT_SLUG, parseKit } from "@/lib/mediaKit";
import { MediaKitView } from "@/components/MediaKitView";

// This segment is the portfolio (/maya/portfolio), one of the creator's extra pages
// (/maya/summer-sale), or a product (/maya/<id>).
async function loadKit(handle: string, segment: string) {
  if (segment.toLowerCase() !== KIT_SLUG) return null;
  const creator = await db.creator.findUnique({ where: { handle: handle.toLowerCase() }, include: { mediaKit: true } });
  if (!creator || creator.pausedAt || !creator.mediaKit?.published) return null;
  return { creator, kit: creator.mediaKit };
}

async function loadPage(handle: string, slug: string) {
  const creator = await db.creator.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!creator || creator.pausedAt) return null;
  const page = await db.page.findUnique({
    where: { creatorId_slug: { creatorId: creator.id, slug: slug.toLowerCase() } },
    include: { products: { where: { published: true, archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  return page ? { ...page, creator } : null;
}

async function load(handle: string, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { creator: true, page: true } });
  if (!product || !product.published || (product.type === "LINK" && !product.collectEmails) || product.creator.handle !== handle.toLowerCase() || product.creator.pausedAt) return null;
  return product;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; productId: string }> }): Promise<Metadata> {
  const { handle, productId } = await params;
  const kit = await loadKit(handle, productId);
  if (kit) return { title: `${kit.creator.displayName} | Portfolio`, description: kit.kit.headline || undefined };
  const page = await loadPage(handle, productId);
  if (page) return { title: `${page.title} | ${page.creator.displayName}`, description: page.description || undefined };
  const p = await load(handle, productId);
  return p ? { title: `${p.title} | ${p.creator.displayName}`, description: p.subtitle || undefined } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string; productId: string }> }) {
  const { handle, productId } = await params;
  // Portfolios used to live at /maya/media-kit.
  if (productId.toLowerCase() === OLD_KIT_SLUG) permanentRedirect(`/${handle}/${KIT_SLUG}`);
  const kit = await loadKit(handle, productId);
  if (kit) {
    return <MediaKitView creator={kit.creator} headline={kit.kit.headline} doc={parseKit(kit.kit.data, kit.kit.about)} updatedAt={kit.kit.updatedAt} />;
  }
  const page = await loadPage(handle, productId);
  if (page) {
    const design = designOf(page.creator);
    return (
      <StoreShell design={design}>
        <main className="mx-auto max-w-md">
          <StoreHeader creator={page.creator} page={page} />
          <StoreProducts products={page.products} handle={page.creator.handle} layout={design.layout} />
          <StoreFooter />
        </main>
      </StoreShell>
    );
  }
  const product = await load(handle, productId);
  if (!product) notFound();
  const { creator } = product;
  const cover = fileUrl(product.coverKey);
  const paid = product.type === "DIGITAL" && product.priceCents > 0;
  const affiliate = product.type === "AFFILIATE";
  const extras = affiliate ? parseExtras(product.extras) : null;
  const video = extras?.video ? videoEmbed(extras.video) : null;
  const cta = paid ? `${defaultCta(product)} · ${priceLabel(product)}` : product.type === "LINK" ? "Continue" : defaultCta(product);

  return (
    <StoreShell design={designOf(creator)} fadeAt={260}>
      <main className="mx-auto max-w-md px-4 pt-5">
        <Link href={product.page ? `/${creator.handle}/${product.page.slug}` : `/${creator.handle}`} className="flex items-center gap-2.5 text-sm font-semibold">
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
            {product.type === "LINK" ? (
              <p className="mt-2 text-[var(--card-muted)]">Enter your email to continue.</p>
            ) : (
              priceLabel(product) && <p className="mt-3 text-2xl font-black text-[var(--accent)]">{priceLabel(product)}</p>
            )}
            {video && (
              <div className="mt-4 aspect-video overflow-hidden rounded-[var(--card-radius)] bg-black">
                <iframe src={video} title={product.title} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
              </div>
            )}
            {product.description && <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed opacity-90">{product.description}</div>}
            {extras && extras.gallery.length > 0 && (
              <div className={`mt-4 grid gap-2 ${extras.gallery.length > 1 ? "grid-cols-2" : ""}`}>
                {extras.gallery.map((key) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={key} src={fileUrl(key)!} alt="" className="aspect-square w-full rounded-[calc(var(--card-radius)*0.75)] object-cover" loading="lazy" />
                ))}
              </div>
            )}
            {extras?.code && <div className="mt-5"><CopyCode code={extras.code} /></div>}
            {affiliate && !product.collectEmails ? (
              <div className="mt-6">
                <a href={`/api/go/${product.id}`} target="_blank" rel="sponsored noopener" className="block w-full rounded-[var(--btn-radius)] bg-[var(--accent)] py-3.5 text-center text-base font-semibold text-[var(--on-accent)] transition hover:opacity-90">
                  {cta}
                </a>
              </div>
            ) : (
              <div className="mt-6">
                <BuyForm
                  productId={product.id}
                  kind={product.type === "DIGITAL" ? "buy" : "optin"}
                  cta={cta}
                  disabledReason={paid && !canSell(creator) ? "This product isn't available for purchase yet." : undefined}
                />
                {paid && <p className="mt-3 text-center text-xs text-[var(--card-muted)]">Secure checkout by Stripe. Apple Pay and Google Pay supported.</p>}
              </div>
            )}
            {extras && extras.buttons.length > 0 && (
              <div className="mt-3 space-y-2">
                {extras.buttons.map((b, i) => (
                  <a key={i} href={`/api/go/${product.id}?b=${i}`} target="_blank" rel="sponsored noopener" className="block w-full rounded-[var(--btn-radius)] border-2 border-[var(--accent)] py-3 text-center font-semibold text-[var(--accent)] transition hover:opacity-80">
                    {b.label}
                  </a>
                ))}
              </div>
            )}
            {affiliate && <p className="mt-4 text-center text-xs text-[var(--card-muted)]">Affiliate link: {creator.displayName} may earn a commission if you buy.</p>}
          </div>
        </article>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
