import { BUTTON_STYLES, designOf, FONTS, LAYOUTS, THEMES, type Design, type DesignInput } from "./design";
import { DEFAULT_BANNER_STYLE, parseBannerStyle, type BannerStyle } from "./banner";

// The look and content of one extra store page (Page.design), edited in the page builder.
// Like the other style columns, everything goes through parsePageDesign, which fills in
// defaults and drops anything it doesn't understand, so old or partial data always renders.

export const BLOCK_TYPES = {
  products: { label: "Products", icon: "🛍️", hint: "This page's products" },
  heading: { label: "Heading", icon: "🔠", hint: "A big title" },
  text: { label: "Text", icon: "📝", hint: "A paragraph" },
  image: { label: "Image", icon: "🖼️", hint: "One picture" },
  gallery: { label: "Gallery", icon: "🎞️", hint: "Up to 9 pictures" },
  video: { label: "Video", icon: "▶️", hint: "YouTube, Vimeo, Loom, TikTok, Instagram" },
  button: { label: "Button", icon: "🔘", hint: "A link button" },
  quote: { label: "Testimonial", icon: "💬", hint: "A quote from a happy customer" },
  faq: { label: "FAQ", icon: "❓", hint: "Questions and answers" },
  countdown: { label: "Countdown", icon: "⏳", hint: "Timer to a date" },
  divider: { label: "Divider", icon: "➖", hint: "A thin line" },
  spacer: { label: "Space", icon: "↕️", hint: "Empty space" },
} as const;
export type BlockType = keyof typeof BLOCK_TYPES;

export const ALIGNS = { left: { label: "Left" }, center: { label: "Center" }, right: { label: "Right" } } as const;
export type Align = keyof typeof ALIGNS;
export const SIZES = { s: { label: "Small" }, m: { label: "Medium" }, l: { label: "Large" } } as const;
export type Size = keyof typeof SIZES;

export type Block =
  | { id: string; type: "products"; title: string }
  | { id: string; type: "heading"; text: string; size: Size; align: Align }
  | { id: string; type: "text"; text: string; align: Align }
  | { id: string; type: "image"; key: string; caption: string; link: string; shape: "wide" | "square" | "tall" }
  | { id: string; type: "gallery"; keys: string[]; columns: 2 | 3 }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "button"; label: string; url: string; style: "solid" | "outline" }
  | { id: string; type: "quote"; text: string; name: string; stars: number }
  | { id: string; type: "faq"; items: { q: string; a: string }[] }
  | { id: string; type: "countdown"; to: string; label: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: Size };

export const BACKGROUNDS = {
  theme: { label: "From theme" },
  color: { label: "Color" },
  gradient: { label: "Gradient" },
  image: { label: "Image" },
} as const;

export const HEADER_BANNERS = {
  store: { label: "Same as store" },
  custom: { label: "Its own banner" },
  none: { label: "No banner" },
} as const;

export type PageDesign = {
  // custom: false uses the store's own look (theme, colors, font...).
  look: Design & { custom: boolean };
  background: { kind: keyof typeof BACKGROUNDS; color: string; color2: string; angle: number; imageKey: string; dim: number };
  header: {
    show: boolean;
    banner: keyof typeof HEADER_BANNERS;
    bannerKey: string;
    bannerStyle: BannerStyle;
    showAvatar: boolean;
    showName: boolean;
    showSocials: boolean;
    titleSize: Size;
    align: Align;
  };
  blocks: Block[];
  footer: { show: boolean; text: string; links: { label: string; url: string }[]; showSocials: boolean; madeWith: boolean };
};

export const MAX_BLOCKS = 40;
export const MAX_GALLERY_IMAGES = 9;
export const MAX_FAQ = 12;
export const MAX_FOOTER_LINKS = 6;

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
const oneOf = <T extends object>(options: T, v: unknown, fallback: keyof T) => (typeof v === "string" && v in options ? (v as keyof T) : fallback);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
// Image keys are checked against the creator on save (pageDesignKeys); here they only need to look like keys.
const key = (v: unknown) => (typeof v === "string" && /^[\w./-]{1,300}$/.test(v) && !v.includes("..") ? v : "");

export function newBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newBlock(type: BlockType): Block {
  const id = newBlockId();
  switch (type) {
    case "products": return { id, type, title: "" };
    case "heading": return { id, type, text: "Your heading", size: "m", align: "center" };
    case "text": return { id, type, text: "Write something here.", align: "center" };
    case "image": return { id, type, key: "", caption: "", link: "", shape: "wide" };
    case "gallery": return { id, type, keys: [], columns: 3 };
    case "video": return { id, type, url: "" };
    case "button": return { id, type, label: "Learn more", url: "", style: "solid" };
    case "quote": return { id, type, text: "This changed everything for me!", name: "Happy customer", stars: 5 };
    case "faq": return { id, type, items: [{ q: "How do I get it?", a: "Right after you pay, you get an email with your download link." }] };
    case "countdown": return { id, type, to: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16), label: "Sale ends in" };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: "m" };
  }
}

function parseBlock(raw: unknown): Block | null {
  const o = obj(raw);
  const type = oneOf(BLOCK_TYPES, o.type, "divider");
  if (o.type !== type) return null;
  const id = typeof o.id === "string" && /^[\w-]{1,20}$/.test(o.id) ? o.id : newBlockId();
  switch (type) {
    case "products": return { id, type, title: str(o.title, 120) };
    case "heading": return { id, type, text: str(o.text, 200), size: oneOf(SIZES, o.size, "m"), align: oneOf(ALIGNS, o.align, "center") };
    case "text": return { id, type, text: str(o.text, 3000), align: oneOf(ALIGNS, o.align, "center") };
    case "image": return { id, type, key: key(o.key), caption: str(o.caption, 200), link: str(o.link, 2000), shape: oneOf({ wide: 1, square: 1, tall: 1 }, o.shape, "wide") };
    case "gallery": return { id, type, keys: (Array.isArray(o.keys) ? o.keys.map(key).filter(Boolean) : []).slice(0, MAX_GALLERY_IMAGES), columns: o.columns === 2 ? 2 : 3 };
    case "video": return { id, type, url: str(o.url, 500) };
    case "button": return { id, type, label: str(o.label, 60), url: str(o.url, 2000), style: o.style === "outline" ? "outline" : "solid" };
    case "quote": return { id, type, text: str(o.text, 600), name: str(o.name, 80), stars: Math.round(num(o.stars, 0, 5, 5)) };
    case "faq": {
      const items = (Array.isArray(o.items) ? o.items : []).map((i) => ({ q: str(obj(i).q, 200), a: str(obj(i).a, 1500) })).slice(0, MAX_FAQ);
      return { id, type, items };
    }
    case "countdown": return { id, type, to: str(o.to, 40), label: str(o.label, 80) };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: oneOf(SIZES, o.size, "m") };
  }
}

export function parsePageDesign(raw: unknown, store: DesignInput): PageDesign {
  const o = obj(raw);
  const base = designOf(store);
  const look = obj(o.look);
  const bg = obj(o.background);
  const h = obj(o.header);
  const f = obj(o.footer);
  const blocks = (Array.isArray(o.blocks) ? o.blocks : [{ id: "products", type: "products" }]).map(parseBlock).filter((b): b is Block => b !== null).slice(0, MAX_BLOCKS);
  return {
    look: {
      custom: bool(look.custom, false),
      accentColor: color(look.accentColor, base.accentColor),
      theme: oneOf(THEMES, look.theme, base.theme),
      font: oneOf(FONTS, look.font, base.font),
      buttonStyle: oneOf(BUTTON_STYLES, look.buttonStyle, base.buttonStyle),
      layout: oneOf(LAYOUTS, look.layout, base.layout),
    },
    background: {
      kind: oneOf(BACKGROUNDS, bg.kind, "theme"),
      color: color(bg.color, "#fafafa"),
      color2: color(bg.color2, base.accentColor),
      angle: Math.round(num(bg.angle, 0, 360, 180)),
      imageKey: key(bg.imageKey),
      dim: Math.round(num(bg.dim, 0, 90, 30)),
    },
    header: {
      show: bool(h.show, true),
      banner: oneOf(HEADER_BANNERS, h.banner, "store"),
      bannerKey: key(h.bannerKey),
      bannerStyle: h.bannerStyle ? parseBannerStyle(h.bannerStyle) : DEFAULT_BANNER_STYLE,
      showAvatar: bool(h.showAvatar, true),
      showName: bool(h.showName, true),
      showSocials: bool(h.showSocials, true),
      titleSize: oneOf(SIZES, h.titleSize, "m"),
      align: oneOf(ALIGNS, h.align, "center"),
    },
    blocks,
    footer: {
      show: bool(f.show, true),
      text: str(f.text, 300),
      links: (Array.isArray(f.links) ? f.links : []).map((l) => ({ label: str(obj(l).label, 60), url: str(obj(l).url, 2000) })).slice(0, MAX_FOOTER_LINKS),
      showSocials: bool(f.showSocials, false),
      madeWith: bool(f.madeWith, true),
    },
  };
}

/** The design the page is drawn with: its own look, or the store's. */
export function pageLook(d: PageDesign, store: DesignInput): Design {
  return d.look.custom ? d.look : designOf(store);
}

/** Every uploaded image the design points at, so saving can check they belong to the creator. */
export function pageDesignKeys(d: PageDesign) {
  const keys = [d.background.imageKey, d.header.bannerKey];
  for (const b of d.blocks) {
    if (b.type === "image") keys.push(b.key);
    if (b.type === "gallery") keys.push(...b.keys);
  }
  return keys.filter(Boolean);
}
