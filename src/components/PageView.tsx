import type { CSSProperties } from "react";
import Link from "next/link";
import type { Creator, Product } from "@prisma/client";
import { designVars, onColor, socialStyleOf } from "@/lib/design";
import { FONT_CLASS } from "@/lib/fonts";
import { fileUrl } from "@/lib/format";
import { parseSocialLinks } from "@/lib/socials";
import { parseIconStyle } from "@/lib/iconStyle";
import { AVATAR_SIZES, parseAvatarStyle } from "@/lib/avatar";
import { bannerSrc, parseBannerStyle } from "@/lib/banner";
import { isVerticalVideo, normalizeUrl, videoEmbed } from "@/lib/affiliate";
import { pageLook, type Align, type Block, type PageDesign, type Size } from "@/lib/pageDesign";
import { Avatar, Banner, ProductCard, SocialLinks } from "./Storefront";
import { Countdown } from "./Countdown";

export type PageCreator = Pick<
  Creator,
  "handle" | "avatarKey" | "avatarStyle" | "bannerKey" | "bannerStyle" | "displayName" | "accentColor" | "bio" | "socialLinks" | "socialStyle" | "socialIconStyle" | "theme" | "font" | "buttonStyle" | "layout"
>;

const ALIGN: Record<Align, string> = { left: "text-left items-start", center: "text-center items-center", right: "text-right items-end" };
const TITLE: Record<Size, string> = { s: "text-lg", m: "text-2xl", l: "text-4xl" };
const HEADING: Record<Size, string> = { s: "text-lg", m: "text-2xl", l: "text-3xl" };
const SPACE: Record<Size, string> = { s: "h-4", m: "h-10", l: "h-20" };
const CARD = "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] text-[var(--card-text)]";

// Page colors: the theme's, unless the page has its own background, in which case text switches to
// whatever reads on it.
function shellStyle(d: PageDesign, creator: PageCreator): CSSProperties {
  const look = pageLook(d, creator);
  const vars = designVars(look) as unknown as Record<string, string>;
  const bg = d.background;
  const textOn = (hex: string) => {
    const t = onColor(hex);
    return { "--page-text": t, "--page-muted": t === "#ffffff" ? "#ffffffcc" : "#525252", color: t };
  };
  if (bg.kind === "color") return { ...vars, ...textOn(bg.color), background: bg.color } as CSSProperties;
  if (bg.kind === "gradient") return { ...vars, ...textOn(bg.color), background: `linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2})` } as CSSProperties;
  if (bg.kind === "image" && bg.imageKey) {
    const shade = `rgba(0,0,0,${bg.dim / 100})`;
    return {
      ...vars,
      ...(bg.dim >= 25 ? textOn("#000000") : {}),
      background: `linear-gradient(${shade}, ${shade}), url("${fileUrl(bg.imageKey)}") center / cover no-repeat`,
    } as CSSProperties;
  }
  return vars as CSSProperties;
}

function Header({ d, creator, title, description }: { d: PageDesign; creator: PageCreator; title: string; description: string }) {
  const h = d.header;
  const accent = pageLook(d, creator).accentColor;
  const style = h.banner === "custom" ? h.bannerStyle : parseBannerStyle(creator.bannerStyle);
  const banner = h.banner === "none" ? null : bannerSrc(style, h.banner === "custom" ? h.bannerKey : creator.bannerKey, accent);
  const avatarPx = AVATAR_SIZES[parseAvatarStyle(creator.avatarStyle).size].px;
  const placement = !h.showAvatar ? "hidden" : banner ? style.avatar : "none";
  const links = h.showSocials ? parseSocialLinks(creator.socialLinks) : [];
  return (
    <header className="flex flex-col">
      {banner && (
        <Banner src={banner} style={style} accent={accent} minHeight={placement === "inside" ? avatarPx + 40 : undefined}>
          {placement === "inside" && <Avatar creator={creator} />}
        </Banner>
      )}
      <div
        className={`flex flex-col px-5 ${ALIGN[h.align]} ${placement === "none" || (placement === "hidden" && !banner) ? "pt-10" : placement === "overlap" ? "" : "pt-5"}`}
        style={placement === "overlap" ? { marginTop: -avatarPx / 2 } : undefined}
      >
        {(placement === "overlap" || placement === "below" || placement === "none") && <Avatar creator={creator} />}
        {h.showName && <p className={`${placement === "hidden" || placement === "inside" ? "" : "mt-3"} text-sm font-semibold text-[var(--page-muted)]`}>{creator.displayName}</p>}
        {title && <h1 className={`mt-1 font-bold tracking-tight ${TITLE[h.titleSize]}`}>{title}</h1>}
        {description && <p className="mt-2 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-[var(--page-muted)]">{description}</p>}
        {links.length > 0 && (
          <SocialLinks links={links} style={socialStyleOf(creator.socialStyle)} iconStyle={parseIconStyle(creator.socialIconStyle)} accent={accent} dark={pageLook(d, creator).theme === "dark"} />
        )}
      </div>
    </header>
  );
}

function BlockView({ b, d, creator, products, preview }: { b: Block; d: PageDesign; creator: PageCreator; products: Product[]; preview: boolean }) {
  switch (b.type) {
    case "products":
      if (!products.length && !preview) return null;
      return (
        <div className="space-y-3">
          {b.title && <h2 className="text-center text-lg font-bold">{b.title}</h2>}
          {products.map((p) => <ProductCard key={p.id} product={p} handle={creator.handle} layout={pageLook(d, creator).layout} />)}
          {/* Pages don't need products, so visitors never see an empty-shelf message; only the builder hints. */}
          {products.length === 0 && preview && <p className="py-8 text-center text-sm text-[var(--page-muted)]">Products you add to this page show here.</p>}
        </div>
      );
    case "heading":
      return b.text ? <h2 className={`flex flex-col font-bold tracking-tight ${ALIGN[b.align]} ${HEADING[b.size]}`}>{b.text}</h2> : null;
    case "text":
      return b.text ? <p className={`whitespace-pre-line text-[15px] leading-relaxed ${b.align === "left" ? "text-left" : b.align === "right" ? "text-right" : "text-center"}`}>{b.text}</p> : null;
    case "image": {
      if (!b.key) return null;
      const href = b.link ? normalizeUrl(b.link) : null;
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(b.key)!} alt={b.caption} className={`w-full rounded-[var(--card-radius)] object-cover ${b.shape === "square" ? "aspect-square" : b.shape === "tall" ? "aspect-[4/5]" : "aspect-[16/10]"}`} />
      );
      return (
        <figure>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer">{img}</a> : img}
          {b.caption && <figcaption className="mt-2 text-center text-sm text-[var(--page-muted)]">{b.caption}</figcaption>}
        </figure>
      );
    }
    case "gallery":
      return b.keys.length ? (
        <div className={`grid gap-2 ${b.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {b.keys.map((k, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={fileUrl(k)!} alt="" className="aspect-square w-full rounded-[calc(var(--card-radius)*0.6)] object-cover" />
          ))}
        </div>
      ) : null;
    case "video": {
      const embed = b.url ? videoEmbed(b.url, { social: true }) : null;
      if (!embed) return null;
      const tall = isVerticalVideo(embed, b.url);
      return (
        <div className={`mx-auto overflow-hidden rounded-[var(--card-radius)] ${tall ? "aspect-[9/16] max-w-xs" : "aspect-video"}`}>
          <iframe src={embed} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" title="Video" />
        </div>
      );
    }
    case "button": {
      const href = normalizeUrl(b.url);
      if (!href || !b.label) return null;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`block rounded-[var(--btn-radius)] py-3 text-center text-sm font-semibold transition hover:opacity-90 ${b.style === "outline" ? "border-2 border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--accent)] text-[var(--on-accent)]"}`}
        >
          {b.label}
        </a>
      );
    }
    case "quote":
      return b.text ? (
        <blockquote className={`${CARD} p-5 text-center`}>
          {b.stars > 0 && <p className="mb-2 text-[var(--accent)]" aria-label={`${b.stars} out of 5 stars`}>{"★".repeat(b.stars)}<span className="opacity-25">{"★".repeat(5 - b.stars)}</span></p>}
          <p className="whitespace-pre-line text-[15px] italic leading-relaxed">“{b.text}”</p>
          {b.name && <footer className="mt-3 text-sm font-semibold text-[var(--card-muted)]">{b.name}</footer>}
        </blockquote>
      ) : null;
    case "faq":
      return b.items.some((i) => i.q) ? (
        <div className="space-y-2">
          {b.items.filter((i) => i.q).map((i, n) => (
            <details key={n} className={`${CARD} group px-4 py-3`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                {i.q}
                <span aria-hidden className="text-[var(--card-muted)] transition-transform group-open:rotate-45">+</span>
              </summary>
              {i.a && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--card-muted)]">{i.a}</p>}
            </details>
          ))}
        </div>
      ) : null;
    case "countdown":
      return b.to ? <Countdown to={b.to} label={b.label} /> : null;
    case "divider":
      return <hr className="border-0 border-t border-current opacity-15" />;
    case "spacer":
      return <div className={SPACE[b.size]} aria-hidden />;
  }
}

function Footer({ d, creator }: { d: PageDesign; creator: PageCreator }) {
  const f = d.footer;
  if (!f.show) return <div className="h-10" />;
  const links = f.links.map((l) => ({ label: l.label, href: normalizeUrl(l.url) })).filter((l) => l.label && l.href);
  const socials = f.showSocials ? parseSocialLinks(creator.socialLinks) : [];
  const look = pageLook(d, creator);
  return (
    <footer className="space-y-3 px-5 py-10 text-center text-sm text-[var(--page-muted)]">
      {links.length > 0 && (
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {links.map((l, i) => <a key={i} href={l.href!} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">{l.label}</a>)}
        </nav>
      )}
      {socials.length > 0 && <SocialLinks links={socials} style={socialStyleOf(creator.socialStyle)} iconStyle={parseIconStyle(creator.socialIconStyle)} accent={look.accentColor} dark={look.theme === "dark"} />}
      {f.text && <p className="whitespace-pre-line">{f.text}</p>}
      {f.madeWith && <p className="text-xs opacity-80"><Link href="/" className="hover:opacity-70">Made with <span className="font-bold">TapShopUGC</span></Link></p>}
    </footer>
  );
}

/** One extra store page, drawn from its design. Used by the public page and the builder's live preview. */
export function PageView({ design, creator, title, description, products, className = "min-h-dvh", preview = false }: {
  design: PageDesign;
  creator: PageCreator;
  title: string;
  description: string;
  products: Product[];
  className?: string;
  preview?: boolean;
}) {
  const look = pageLook(design, creator);
  return (
    <div className={`${className} ${FONT_CLASS[look.font]}`} style={shellStyle(design, creator)}>
      <main className="mx-auto max-w-md">
        {design.header.show && <Header d={design} creator={creator} title={title} description={description} />}
        <div className="mt-8 space-y-5 px-4">
          {design.blocks.map((b) => <BlockView key={b.id} b={b} d={design} creator={creator} products={products} preview={preview} />)}
        </div>
        <Footer d={design} creator={creator} />
      </main>
    </div>
  );
}
