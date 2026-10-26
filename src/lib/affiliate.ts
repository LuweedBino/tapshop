// The extra content on an affiliate page, stored in Product.extras.

export type AffiliateButton = { label: string; url: string };
export type AffiliateExtras = {
  /** Public image keys shown under the description. */
  gallery: string[];
  /** A YouTube, Vimeo or Loom link. */
  video: string;
  /** Buttons under the main one, each with its own link. */
  buttons: AffiliateButton[];
  /** A discount code shown with a copy button. */
  code: string;
};

export const MAX_GALLERY = 6;
export const MAX_BUTTONS = 4;

export function parseExtras(value: unknown): AffiliateExtras {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
  const buttons = Array.isArray(v.buttons)
    ? v.buttons.filter((b): b is AffiliateButton => !!b && typeof b.label === "string" && typeof b.url === "string")
    : [];
  return {
    gallery: strings(v.gallery).slice(0, MAX_GALLERY),
    video: typeof v.video === "string" ? v.video : "",
    buttons: buttons.slice(0, MAX_BUTTONS),
    code: typeof v.code === "string" ? v.code : "",
  };
}

/** "example.com/x" → "https://example.com/x"; null when it isn't a web link. */
export function normalizeUrl(input: string) {
  const s = input.trim();
  if (!s) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The embeddable player URL for a YouTube, Vimeo or Loom link, or null. With `social`, TikTok and Instagram links work too. */
export function videoEmbed(link: string, { social = false } = {}) {
  const url = normalizeUrl(link);
  if (!url) return null;
  const u = new URL(url);
  const host = u.hostname.replace(/^(www|m)\./, "");
  let id: string | null | undefined;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vid = u.pathname.match(/(\d{5,})/)?.[1];
    if (vid) return `https://player.vimeo.com/video/${vid}`;
  }
  if (host === "loom.com") {
    const lid = u.pathname.match(/^\/(?:share|embed)\/([\da-f]{16,})/)?.[1];
    if (lid) return `https://www.loom.com/embed/${lid}`;
  }
  if (social && host === "tiktok.com") {
    const tid = u.pathname.match(/\/video\/(\d{10,25})/)?.[1];
    if (tid) return `https://www.tiktok.com/embed/v2/${tid}`;
  }
  if (social && host === "instagram.com") {
    const code = u.pathname.match(/^\/(?:p|reels?|tv)\/([\w-]{5,40})/)?.[1];
    if (code) return `https://www.instagram.com/reel/${code}/embed`;
  }
  return null;
}

/** True for players that are tall rather than wide: TikTok, Instagram and YouTube Shorts. */
export function isVerticalVideo(embed: string, link: string) {
  return /tiktok\.com|instagram\.com/.test(embed) || /youtube\.com\/shorts\//.test(link);
}
