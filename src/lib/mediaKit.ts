// A media kit is a list of sections ("blocks") the creator adds, orders and styles.
// Stored in MediaKit.data as { version: 2, style, tags, blocks }. Kits saved before the
// builder (plain stats/audience/partnerships/... fields) are converted on read.
import { z } from "zod";
import { FONTS, THEMES } from "./design";
import { isSocialKind, PLATFORMS, type SocialKind } from "./socials";

export const KIT_SLUG = "media-kit";
export const LIMITS = { blocks: 24, items: 12, gallery: 12, tags: 6 };

/** Platforms that have followers worth showing a brand. */
export const STAT_PLATFORMS = (Object.keys(PLATFORMS) as SocialKind[]).filter((k) =>
  ["Social", "Video & streaming", "Music & podcasts"].includes(PLATFORMS[k].group) || ["substack", "patreon", "medium"].includes(k),
);

const id = z.string().max(40);
const s = (max: number) => z.string().max(max).default("");
const pct = z.number().min(0).max(100);
const count = z.number().int().min(0).max(1e12);
const items = <T extends z.ZodTypeAny>(item: T, max = LIMITS.items) => z.array(item).max(max).default([]);

const Stat = z.object({ id, kind: z.string().refine(isSocialKind), handle: s(60), followers: count.default(0), avgViews: count.nullable().default(null), engagement: pct.nullable().default(null) });
const Share = z.object({ id, label: s(40), pct: pct.default(0) });

const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** The ways each kind of section can lay out its content. The first is the default. */
export const LAYOUTS = {
  stats: { tiles: { label: "Tiles" }, list: { label: "List" }, big: { label: "Big numbers" }, chips: { label: "Compact" } },
  highlights: { tiles: { label: "Tiles" }, row: { label: "In a row" }, stacked: { label: "Stacked" }, badges: { label: "Badges" } },
  text: { plain: { label: "Plain" }, large: { label: "Large" }, quote: { label: "Pull quote" }, dropcap: { label: "Drop cap" } },
  audience: { bars: { label: "Bars" }, rings: { label: "Rings" }, numbers: { label: "Big numbers" }, chips: { label: "Chips" } },
  brands: { cards: { label: "Cards" }, logos: { label: "Logo wall" }, grid: { label: "Logo tiles" }, list: { label: "List" }, marquee: { label: "Scrolling strip" } },
  testimonials: { cards: { label: "Cards" }, big: { label: "Big quote" }, carousel: { label: "Swipe" }, bubbles: { label: "Chat bubbles" } },
  rates: { list: { label: "List" }, cards: { label: "Price cards" }, menu: { label: "Menu" }, table: { label: "Table" } },
  gallery: { grid: { label: "Grid" }, masonry: { label: "Masonry" }, carousel: { label: "Swipe" }, collage: { label: "Collage" }, polaroid: { label: "Polaroids" } },
  video: {
    standard: { label: "Stacked" },
    bleed: { label: "Edge to edge" },
    framed: { label: "Framed" },
    grid: { label: "Grid" },
    carousel: { label: "Swipe" },
    featured: { label: "Featured + more" },
    shorts: { label: "Vertical (Reels/TikTok)" },
    cinema: { label: "Cinema" },
    list: { label: "List" },
  },
  links: { outline: { label: "Outline" }, solid: { label: "Solid" }, pills: { label: "Pills" }, cards: { label: "Cards" }, text: { label: "Text links" } },
  contact: { form: { label: "Form" }, spotlight: { label: "Spotlight" } },
} as const;
const layout = <T extends keyof typeof LAYOUTS>(t: T) => {
  const k = keys(LAYOUTS[t]);
  return z.enum(k).default(k[0] as never);
};

export const BLOCKS = {
  stats: {
    label: "Stats",
    hint: "Followers, views and engagement per platform",
    schema: z.object({ layout: layout("stats"), items: items(Stat, 10), showTotal: z.boolean().default(true) }),
  },
  highlights: {
    label: "Highlights",
    hint: "Big numbers, like 2M monthly views",
    schema: z.object({ layout: layout("highlights"), items: items(z.object({ id, value: s(20), label: s(60) }), 6) }),
  },
  text: { label: "Text", hint: "About me, my story, what I post", schema: z.object({ layout: layout("text"), body: s(3000) }) },
  audience: {
    label: "Audience",
    hint: "Gender, age and top locations",
    schema: z.object({
      layout: layout("audience"),
      gender: z.object({ women: pct, men: pct, other: pct }).nullable().default(null),
      ages: items(Share, 8),
      locations: items(Share, 8),
    }),
  },
  brands: {
    label: "Brands I've worked with",
    hint: "Past partnerships with logos",
    schema: z.object({
      layout: layout("brands"),
      items: items(z.object({ id, brand: s(60), logoKey: s(200), description: s(300), url: s(500) }), 24),
    }),
  },
  testimonials: {
    label: "Testimonials",
    hint: "What brands said about working with you",
    schema: z.object({ layout: layout("testimonials"), items: items(z.object({ id, quote: s(600), name: s(80), role: s(80) }), 8) }),
  },
  rates: {
    label: "Rates",
    hint: "What brands can book and the price",
    schema: z.object({ layout: layout("rates"), items: items(z.object({ id, name: s(80), price: s(40), description: s(300) })), note: s(300) }),
  },
  gallery: {
    label: "Photos",
    hint: "Your best shots or past work",
    schema: z.object({ layout: layout("gallery"), images: z.array(z.string().max(200)).max(LIMITS.gallery).default([]), columns: z.union([z.literal(2), z.literal(3)]).default(3) }),
  },
  video: {
    label: "Videos",
    hint: "YouTube, TikTok, Instagram, Vimeo or Loom videos",
    schema: z.object({ layout: layout("video"), items: items(z.object({ id, url: s(500), caption: s(200) }), 8) }),
  },
  links: {
    label: "Links",
    hint: "Buttons to your best posts, website or press",
    schema: z.object({ layout: layout("links"), items: items(z.object({ id, label: s(60), url: s(500) }), 8) }),
  },
  contact: { label: "Work with me", hint: "A form brands use to reach you", schema: z.object({ layout: layout("contact"), intro: s(300) }) },
} as const;

/** How a section's box looks. Each is a .mk-box-* class in globals.css. */
export const BOX_STYLES = {
  cards: { label: "Cards" },
  glass: { label: "Glass" },
  float: { label: "Floating" },
  tint: { label: "Tinted" },
  outline: { label: "Outline" },
  gradient: { label: "Gradient edge" },
  neon: { label: "Neon glow" },
  brutal: { label: "Brutalist" },
  accent: { label: "Solid color" },
  flat: { label: "Flat lines" },
  minimal: { label: "Minimal" },
} as const;

/** How section titles look. Each is a .mk-t-* class. */
export const TITLE_STYLES = {
  label: { label: "Small caps" },
  accent: { label: "Color caps" },
  bold: { label: "Big & bold" },
  underline: { label: "Underline" },
  bar: { label: "Side bar" },
  pill: { label: "Pill" },
  numbered: { label: "Numbered" },
} as const;

/** Decoration behind the whole page. Each is a .mk-bg-* class. */
export const BACKDROPS = {
  none: { label: "None" },
  glow: { label: "Glow" },
  mesh: { label: "Mesh gradient" },
  aurora: { label: "Aurora (moves)" },
  dots: { label: "Dots" },
  grid: { label: "Grid" },
} as const;

export const CORNERS = { sharp: { label: "Sharp" }, soft: { label: "Soft" }, round: { label: "Round" } } as const;
export const MOTIONS = { none: { label: "None" }, fade: { label: "Fade up" }, pop: { label: "Pop in" }, slide: { label: "Slide in" } } as const;
export const SPACINGS = { compact: { label: "Tight" }, normal: { label: "Normal" }, airy: { label: "Airy" } } as const;
export const HEADERS = { classic: { label: "Classic" }, hero: { label: "Big name" }, card: { label: "In a box" } } as const;

export type BoxStyle = keyof typeof BOX_STYLES;
export type TitleStyle = keyof typeof TITLE_STYLES;

export type BlockType = keyof typeof BLOCKS;
type Data<T extends BlockType> = z.infer<(typeof BLOCKS)[T]["schema"]>;
/** box, heading, accent and align are this section's own style; null follows the page's. */
type Base<T> = { id: string; type: T; title: string; hidden: boolean; box: BoxStyle | null; heading: TitleStyle | null; accent: string | null; align: "left" | "center" | null };
export type Block = { [T in BlockType]: Base<T> & Data<T> }[BlockType];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type KitStat = Omit<z.infer<typeof Stat>, "kind"> & { kind: SocialKind };

export const KitStyle = z.object({
  /** null keeps the store's setting. */
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().default(null),
  theme: z.enum(Object.keys(THEMES) as [keyof typeof THEMES]).nullable().default(null),
  font: z.enum(Object.keys(FONTS) as [keyof typeof FONTS]).nullable().default(null),
  sections: z.enum(keys(BOX_STYLES)).default("cards"),
  titles: z.enum(keys(TITLE_STYLES)).default("label"),
  backdrop: z.enum(keys(BACKDROPS)).default("none"),
  corners: z.enum(keys(CORNERS)).nullable().default(null),
  motion: z.enum(keys(MOTIONS)).default("none"),
  spacing: z.enum(keys(SPACINGS)).default("normal"),
  header: z.enum(keys(HEADERS)).default("classic"),
  align: z.enum(["center", "left"]).default("center"),
  coverKey: s(200),
  showAvatar: z.boolean().default(true),
});
export type KitStyle = z.infer<typeof KitStyle>;
export type KitDoc = { style: KitStyle; tags: string[]; blocks: Block[] };

let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function newBlock<T extends BlockType>(type: T): BlockOf<T> {
  const data = BLOCKS[type].schema.parse({});
  return { id: newId(), type, title: BLOCKS[type].label, hidden: false, box: null, heading: null, accent: null, align: null, ...data } as BlockOf<T>;
}

function parseBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = r.type as BlockType;
  if (!Object.hasOwn(BLOCKS, type)) return null;
  // Video sections held one video before they held a list.
  const data = BLOCKS[type].schema.safeParse(type === "video" && !Array.isArray(r.items) && typeof r.url === "string" ? { ...r, items: r.url ? [{ id: newId(), url: r.url, caption: r.caption ?? "" }] : [] } : r);
  if (!data.success) return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : newId(),
    type,
    title: typeof r.title === "string" ? r.title.slice(0, 80) : BLOCKS[type].label,
    hidden: r.hidden === true,
    box: Object.hasOwn(BOX_STYLES, r.box as string) ? (r.box as BoxStyle) : null,
    heading: Object.hasOwn(TITLE_STYLES, r.heading as string) ? (r.heading as TitleStyle) : null,
    accent: typeof r.accent === "string" && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent : null,
    align: r.align === "left" || r.align === "center" ? r.align : null,
    ...data.data,
  } as Block;
}

/** Turns a kit saved before the builder into blocks, in the order the old page showed them. */
function fromV1(v: Record<string, unknown>, about: string): Block[] {
  const withIds = (x: unknown) => (Array.isArray(x) ? x.map((i) => ({ id: newId(), ...(i as object) })) : []);
  const raw = [
    { type: "stats", title: "Reach", items: withIds(v.stats) },
    about && { type: "text", title: "About", body: about },
    { type: "audience", title: "Audience", gender: v.gender ?? null, ages: withIds(v.ages), locations: withIds(v.locations) },
    { type: "brands", title: "Brands I've worked with", items: withIds(v.partnerships) },
    { type: "rates", title: "Rates", items: withIds(v.services) },
    { type: "gallery", title: "Gallery", images: Array.isArray(v.gallery) ? v.gallery : [] },
    { type: "contact", title: "Work with me" },
  ].filter(Boolean);
  return raw.map(parseBlock).filter((b): b is Block => b !== null);
}

export function parseKit(value: unknown, about = ""): KitDoc {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const style = KitStyle.safeParse(v.style ?? {});
  const tags = Array.isArray(v.tags) ? v.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.slice(0, 30)).slice(0, LIMITS.tags) : [];
  const blocks = Array.isArray(v.blocks) ? v.blocks.map(parseBlock).filter((b): b is Block => b !== null) : fromV1(v, about);
  return { style: style.success ? style.data : KitStyle.parse({}), tags, blocks: blocks.slice(0, LIMITS.blocks) };
}

/** One-tap combinations of the style options, for creators who don't know where to start. */
export const LOOKS: Record<string, { label: string; style: Partial<KitStyle> }> = {
  classic: { label: "Classic", style: { theme: null, font: null, sections: "cards", titles: "label", backdrop: "none", corners: null, motion: "fade", spacing: "normal", header: "classic" } },
  glass: { label: "Glass", style: { theme: "soft", font: "modern", sections: "glass", titles: "bold", backdrop: "mesh", corners: "round", motion: "fade", spacing: "normal", header: "hero" } },
  aurora: { label: "Aurora", style: { theme: "dark", font: "modern", sections: "glass", titles: "bar", backdrop: "aurora", corners: "round", motion: "fade", spacing: "normal", header: "hero" } },
  neon: { label: "Neon night", style: { theme: "dark", font: "techy", sections: "neon", titles: "accent", backdrop: "grid", corners: "soft", motion: "pop", spacing: "normal", header: "hero" } },
  brutal: { label: "Brutalist", style: { theme: "clean", font: "techy", sections: "brutal", titles: "numbered", backdrop: "dots", corners: "sharp", motion: "slide", spacing: "airy", header: "classic" } },
  editorial: { label: "Editorial", style: { theme: "clean", font: "elegant", sections: "minimal", titles: "underline", backdrop: "none", corners: "sharp", motion: "fade", spacing: "airy", header: "hero" } },
  pastel: { label: "Pastel", style: { theme: "soft", font: "friendly", sections: "tint", titles: "pill", backdrop: "glow", corners: "round", motion: "pop", spacing: "normal", header: "classic" } },
  gradient: { label: "Gradient", style: { theme: "clean", font: "modern", sections: "gradient", titles: "numbered", backdrop: "glow", corners: "soft", motion: "fade", spacing: "normal", header: "card" } },
  pop: { label: "Color pop", style: { theme: "clean", font: "friendly", sections: "accent", titles: "bold", backdrop: "none", corners: "soft", motion: "pop", spacing: "compact", header: "card" } },
  floating: { label: "Floating", style: { theme: "soft", font: "modern", sections: "float", titles: "label", backdrop: "dots", corners: "round", motion: "fade", spacing: "airy", header: "classic" } },
  outline: { label: "Outline", style: { theme: "clean", font: "modern", sections: "outline", titles: "bar", backdrop: "grid", corners: "soft", motion: "slide", spacing: "normal", header: "classic" } },
  mono: { label: "Mono", style: { theme: "clean", font: "modern", sections: "flat", titles: "label", backdrop: "none", corners: "sharp", motion: "none", spacing: "normal", header: "classic" } },
};

/** A starting layout for a creator who hasn't built a kit yet. */
export function starterKit(): KitDoc {
  const intro = newBlock("text");
  intro.title = "About me";
  return { style: KitStyle.parse({}), tags: [], blocks: [newBlock("stats"), intro, newBlock("audience"), newBlock("brands"), newBlock("rates"), newBlock("contact")] };
}

/** "12,300", "4.5k", "1.4M" → 12300, 4500, 1400000. Null when blank or not a number. */
export function parseCount(input: string) {
  const m = input.trim().replace(/[,\s]/g, "").match(/^(\d+(?:\.\d+)?)([kmb])?$/i);
  if (!m) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] ?? "").toLowerCase() as "k" | "m" | "b"] ?? 1;
  return Math.round(Number(m[1]) * mult);
}

/** 1400000 → "1.4M", 4500 → "4.5K", 950 → "950". */
export function formatCount(n: number) {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(n);
}
