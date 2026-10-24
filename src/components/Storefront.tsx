import Link from "next/link";
import type { Creator, Product } from "@prisma/client";
import { fileUrl, money, SOCIALS, type Socials } from "@/lib/format";

const SOCIAL_LABEL: Record<(typeof SOCIALS)[number], string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  website: "Website",
};

export function socialHref(kind: (typeof SOCIALS)[number], value: string) {
  if (/^https?:\/\//.test(value)) return value;
  const v = value.replace(/^@/, "");
  return {
    instagram: `https://instagram.com/${v}`,
    tiktok: `https://tiktok.com/@${v}`,
    youtube: `https://youtube.com/@${v}`,
    x: `https://x.com/${v}`,
    website: `https://${v}`,
  }[kind];
}

export function Avatar({ creator, size = 96 }: { creator: Pick<Creator, "avatarKey" | "displayName" | "accentColor">; size?: number }) {
  const src = fileUrl(creator.avatarKey);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="rounded-full object-cover ring-4 ring-white" style={{ width: size, height: size }} />
  ) : (
    <div className="flex items-center justify-center rounded-full text-3xl font-bold text-white ring-4 ring-white" style={{ width: size, height: size, background: creator.accentColor }}>
      {creator.displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function StoreHeader({ creator }: { creator: Creator }) {
  const socials = (creator.socialLinks ?? {}) as Socials;
  const links = SOCIALS.filter((k) => socials[k]);
  return (
    <header className="flex flex-col items-center px-5 pt-10 text-center">
      <Avatar creator={creator} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{creator.displayName}</h1>
      {creator.bio && <p className="mt-2 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-neutral-600">{creator.bio}</p>}
      {links.length > 0 && (
        <nav className="mt-4 flex flex-wrap justify-center gap-2">
          {links.map((k) => (
            <a key={k} href={socialHref(k, socials[k]!)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-400">
              {SOCIAL_LABEL[k]}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function priceLabel(p: Pick<Product, "type" | "priceCents" | "currency">) {
  return p.type === "LEAD_MAGNET" || p.priceCents === 0 ? "Free" : money(p.priceCents, p.currency);
}

export function defaultCta(p: Pick<Product, "type" | "priceCents" | "ctaLabel">) {
  if (p.ctaLabel) return p.ctaLabel;
  if (p.type === "LEAD_MAGNET") return "Get it free";
  if (p.type === "LINK") return "Open";
  return p.priceCents === 0 ? "Get it free" : "Buy now";
}

export function ProductCard({ product, handle, accent }: { product: Product; handle: string; accent: string }) {
  if (product.type === "LINK") {
    return (
      <a href={product.url ?? "#"} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-center font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {product.title}
      </a>
    );
  }
  const cover = fileUrl(product.coverKey);
  return (
    <Link href={`/${handle}/${product.id}`} className="block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-4 p-4">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${accent}1a`, color: accent }}>
            {product.type === "LEAD_MAGNET" ? "✉" : "⬇"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-snug">{product.title}</h2>
          {product.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{product.subtitle}</p>}
          <p className="mt-1.5 text-sm font-bold" style={{ color: accent }}>{priceLabel(product)}</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-xl py-3 text-center text-sm font-semibold text-white" style={{ background: accent }}>
          {defaultCta(product)}
        </div>
      </div>
    </Link>
  );
}

export function StoreFooter() {
  return (
    <footer className="py-10 text-center text-xs text-neutral-400">
      <Link href="/" className="hover:text-neutral-600">Made with <span className="font-bold">TapShop</span></Link>
    </footer>
  );
}
