import Link from "next/link";
import type { Creator, Product } from "@prisma/client";
import { fileUrl, money } from "@/lib/format";
import { parseSocialLinks, PLATFORMS, socialHref, type SocialLink } from "@/lib/socials";
import { designVars, onColor, socialStyleOf, type Design, type Layout, type SocialStyle } from "@/lib/design";
import { iconButtonStyle, iconGlyphSize, parseIconStyle, type IconStyle } from "@/lib/iconStyle";
import { SocialIcon } from "./SocialIcon";
import { FONT_CLASS } from "@/lib/fonts";
import { AVATAR_SIZES, avatarFrameStyle, avatarImageStyle, parseAvatarStyle } from "@/lib/avatar";

export function Avatar({ creator, size }: { creator: Pick<Creator, "avatarKey" | "avatarStyle" | "displayName" | "accentColor">; size?: number }) {
  const src = fileUrl(creator.avatarKey);
  const style = parseAvatarStyle(creator.avatarStyle);
  const px = size ?? AVATAR_SIZES[style.size].px;
  return (
    <div className="shrink-0 overflow-hidden" style={{ ...avatarFrameStyle(style, creator.accentColor, px), background: creator.accentColor }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={px} height={px} draggable={false} className="h-full w-full object-cover" style={avatarImageStyle(style)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold" style={{ color: onColor(creator.accentColor), fontSize: px * 0.36 }}>
          {creator.displayName.slice(0, 1).toUpperCase()}
        </div>
      )}
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

type HeaderCreator = Pick<Creator, "avatarKey" | "avatarStyle" | "bannerKey" | "displayName" | "accentColor" | "bio" | "socialLinks" | "socialStyle" | "socialIconStyle" | "theme">;

export function StoreHeader({ creator }: { creator: HeaderCreator }) {
  const links = parseSocialLinks(creator.socialLinks);
  const banner = fileUrl(creator.bannerKey);
  return (
    <header className="flex flex-col items-center text-center">
      {banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" className="aspect-[3/1] w-full object-cover" />
      )}
      <div className={`flex flex-col items-center px-5 ${banner ? "" : "pt-10"}`} style={banner ? { marginTop: -AVATAR_SIZES[parseAvatarStyle(creator.avatarStyle).size].px / 2 } : undefined}>
        <Avatar creator={creator} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{creator.displayName}</h1>
        {creator.bio && <p className="mt-2 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-[var(--page-muted)]">{creator.bio}</p>}
        {links.length > 0 && (
          <SocialLinks
            links={links}
            style={socialStyleOf(creator.socialStyle)}
            iconStyle={parseIconStyle(creator.socialIconStyle)}
            accent={creator.accentColor}
            dark={creator.theme === "dark" || (creator.theme === "bold" && onColor(creator.accentColor) === "#ffffff")}
          />
        )}
      </div>
    </header>
  );
}

export function SocialLinks({ links, style, iconStyle, accent, dark }: { links: SocialLink[]; style: SocialStyle; iconStyle: IconStyle; accent: string; dark: boolean }) {
  const iconOnly = style === "icons";
  const base = "si-link flex items-center justify-center border border-[var(--card-border)] bg-[var(--card)] font-semibold text-[var(--card-text)]";
  return (
    <nav className={`mt-4 flex flex-wrap justify-center ${iconOnly ? "gap-2.5" : "gap-2"}`}>
      {links.map((l, i) => {
        const label = PLATFORMS[l.kind].label;
        const href = socialHref(l);
        const props = {
          href,
          ...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" }),
          className: `${base} si-hover-${iconStyle.hover} ${iconOnly ? "" : `gap-1.5 py-1 text-xs ${iconStyle.shape === "none" ? "px-1" : "px-3"}`}`,
          style: iconButtonStyle(iconStyle, l.kind, accent, dark, iconOnly),
        };
        return (
          <span key={i} className={`si-in-${iconStyle.entrance}`} style={{ "--i": i } as React.CSSProperties}>
            <span className={`block si-motion-${iconStyle.motion}`}>
              {iconOnly ? (
                <a {...props} aria-label={label} title={label}>
                  <SocialIcon kind={l.kind} size={iconGlyphSize(iconStyle)} />
                </a>
              ) : (
                <a {...props}>
                  {style === "both" && <SocialIcon kind={l.kind} size={14} />}
                  {label}
                </a>
              )}
            </span>
          </span>
        );
      })}
    </nav>
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
