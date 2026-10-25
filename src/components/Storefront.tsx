import Link from "next/link";
import type { Creator, Product } from "@prisma/client";
import { fileUrl, money, SOCIALS, type Socials } from "@/lib/format";
import { designVars, onColor, type Design, type Layout } from "@/lib/design";
import { FONT_CLASS } from "@/lib/fonts";

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
    <img src={src} alt="" width={size} height={size} className="rounded-full object-cover ring-4 ring-white/90" style={{ width: size, height: size }} />
  ) : (
    <div className="flex items-center justify-center rounded-full text-3xl font-bold ring-4 ring-white/90" style={{ width: size, height: size, background: creator.accentColor, color: onColor(creator.accentColor) }}>
      {creator.displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}

// Page background, colors, corner radius and font for one creator's design.
export function StoreShell({ design, fadeAt, className = "min-h-dvh", children }: { design: Design; fadeAt?: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`${className} ${FONT_CLASS[design.font]}`} style={designVars(design, fadeAt)}>
      {children}
    </div>
  );
}

type HeaderCreator = Pick<Creator, "avatarKey" | "bannerKey" | "displayName" | "accentColor" | "bio" | "socialLinks">;

export function StoreHeader({ creator }: { creator: HeaderCreator }) {
  const socials = (creator.socialLinks ?? {}) as Socials;
  const links = SOCIALS.filter((k) => socials[k]);
  const banner = fileUrl(creator.bannerKey);
  return (
    <header className="flex flex-col items-center text-center">
      {banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" className="aspect-[3/1] w-full object-cover" />
      )}
      <div className={`flex flex-col items-center px-5 ${banner ? "-mt-12" : "pt-10"}`}>
        <Avatar creator={creator} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{creator.displayName}</h1>
        {creator.bio && <p className="mt-2 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-[var(--page-muted)]">{creator.bio}</p>}
        {links.length > 0 && (
          <nav className="mt-4 flex flex-wrap justify-center gap-2">
            {links.map((k) => (
              <a key={k} href={socialHref(k, socials[k]!)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--card-text)] transition hover:opacity-80">
                {SOCIAL_LABEL[k]}
              </a>
            ))}
          </nav>
        )}
      </div>
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

const CARD = "block overflow-hidden rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] text-[var(--card-text)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
const BUTTON = "rounded-[var(--btn-radius)] bg-[var(--accent)] py-3 text-center text-sm font-semibold text-[var(--on-accent)]";

function Thumb({ product, className }: { product: Product; className: string }) {
  const cover = fileUrl(product.coverKey);
  return cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover} alt="" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-2xl text-[var(--accent)] ${className}`}>
      {product.type === "LEAD_MAGNET" ? "✉" : "⬇"}
    </div>
  );
}

export function ProductCard({ product, handle, layout = "card" }: { product: Product; handle: string; layout?: Layout }) {
  if (product.type === "LINK") {
    return (
      <a href={product.url ?? "#"} target="_blank" rel="noopener noreferrer" className={`${CARD} px-5 py-4 text-center font-semibold`}>
        {product.title}
      </a>
    );
  }
  const href = `/${handle}/${product.id}`;
  if (layout === "compact") {
    return (
      <Link href={href} className={`${CARD} flex items-center gap-3 p-2 pr-4`}>
        <Thumb product={product} className="h-12 w-12 shrink-0 rounded-[calc(var(--card-radius)*0.7)]" />
        <span className="min-w-0 flex-1 truncate font-semibold">{product.title}</span>
        <span className="shrink-0 text-sm font-bold text-[var(--accent)]">{priceLabel(product)}</span>
      </Link>
    );
  }
  if (layout === "large") {
    return (
      <Link href={href} className={CARD}>
        <Thumb product={product} className="aspect-[16/9] w-full" />
        <div className="p-4">
          <h2 className="text-lg font-semibold leading-snug">{product.title}</h2>
          {product.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-[var(--card-muted)]">{product.subtitle}</p>}
          <div className={`mt-3 ${BUTTON}`}>{product.type === "DIGITAL" && product.priceCents > 0 ? `${defaultCta(product)} · ${priceLabel(product)}` : defaultCta(product)}</div>
        </div>
      </Link>
    );
  }
  return (
    <Link href={href} className={CARD}>
      <div className="flex gap-4 p-4">
        <Thumb product={product} className="h-20 w-20 shrink-0 rounded-[calc(var(--card-radius)*0.75)]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-snug">{product.title}</h2>
          {product.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-[var(--card-muted)]">{product.subtitle}</p>}
          <p className="mt-1.5 text-sm font-bold text-[var(--accent)]">{priceLabel(product)}</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className={BUTTON}>{defaultCta(product)}</div>
      </div>
    </Link>
  );
}

export function StoreFooter() {
  return (
    <footer className="py-10 text-center text-xs text-[var(--page-muted)] opacity-80">
      <Link href="/" className="hover:opacity-70">Made with <span className="font-bold">TapShop</span></Link>
    </footer>
  );
}
