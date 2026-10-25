// The social link library. Each platform knows how to turn what a creator types
// (a handle, a number, or a full URL) into a link.

type Platform = {
  label: string;
  group: "Social" | "Video & streaming" | "Messaging" | "Music & podcasts" | "Support & sales" | "Work & portfolio" | "Contact";
  /** URL with {v} for the handle; omit when only a full URL makes sense. */
  url?: string;
  placeholder: string;
};

export const PLATFORMS = {
  instagram: { label: "Instagram", group: "Social", url: "https://instagram.com/{v}", placeholder: "@username" },
  tiktok: { label: "TikTok", group: "Social", url: "https://tiktok.com/@{v}", placeholder: "@username" },
  youtube: { label: "YouTube", group: "Video & streaming", url: "https://youtube.com/@{v}", placeholder: "@channel" },
  x: { label: "X (Twitter)", group: "Social", url: "https://x.com/{v}", placeholder: "@username" },
  facebook: { label: "Facebook", group: "Social", url: "https://facebook.com/{v}", placeholder: "Page name or link" },
  threads: { label: "Threads", group: "Social", url: "https://threads.net/@{v}", placeholder: "@username" },
  snapchat: { label: "Snapchat", group: "Social", url: "https://snapchat.com/add/{v}", placeholder: "Username" },
  pinterest: { label: "Pinterest", group: "Social", url: "https://pinterest.com/{v}", placeholder: "Username" },
  linkedin: { label: "LinkedIn", group: "Work & portfolio", url: "https://linkedin.com/in/{v}", placeholder: "Profile name or link" },
  reddit: { label: "Reddit", group: "Social", url: "https://reddit.com/user/{v}", placeholder: "Username" },
  tumblr: { label: "Tumblr", group: "Social", url: "https://{v}.tumblr.com", placeholder: "Blog name" },
  bluesky: { label: "Bluesky", group: "Social", url: "https://bsky.app/profile/{v}", placeholder: "name.bsky.social" },
  mastodon: { label: "Mastodon", group: "Social", placeholder: "Link to your profile" },
  twitch: { label: "Twitch", group: "Video & streaming", url: "https://twitch.tv/{v}", placeholder: "Channel name" },
  kick: { label: "Kick", group: "Video & streaming", url: "https://kick.com/{v}", placeholder: "Channel name" },
  vimeo: { label: "Vimeo", group: "Video & streaming", url: "https://vimeo.com/{v}", placeholder: "Username" },
  whatsapp: { label: "WhatsApp", group: "Messaging", url: "https://wa.me/{n}", placeholder: "Phone number with country code" },
  telegram: { label: "Telegram", group: "Messaging", url: "https://t.me/{v}", placeholder: "@username" },
  discord: { label: "Discord", group: "Messaging", placeholder: "Server invite link" },
  signal: { label: "Signal", group: "Messaging", placeholder: "Signal link" },
  spotify: { label: "Spotify", group: "Music & podcasts", placeholder: "Link to artist, playlist or podcast" },
  applemusic: { label: "Apple Music", group: "Music & podcasts", placeholder: "Link to your music" },
  youtubemusic: { label: "YouTube Music", group: "Music & podcasts", placeholder: "Link to your music" },
  soundcloud: { label: "SoundCloud", group: "Music & podcasts", url: "https://soundcloud.com/{v}", placeholder: "Username" },
  applepodcasts: { label: "Apple Podcasts", group: "Music & podcasts", placeholder: "Link to your podcast" },
  patreon: { label: "Patreon", group: "Support & sales", url: "https://patreon.com/{v}", placeholder: "Page name" },
  substack: { label: "Substack", group: "Support & sales", url: "https://{v}.substack.com", placeholder: "Newsletter name" },
  medium: { label: "Medium", group: "Work & portfolio", url: "https://medium.com/@{v}", placeholder: "@username" },
  kofi: { label: "Ko-fi", group: "Support & sales", url: "https://ko-fi.com/{v}", placeholder: "Username" },
  buymeacoffee: { label: "Buy Me a Coffee", group: "Support & sales", url: "https://buymeacoffee.com/{v}", placeholder: "Username" },
  onlyfans: { label: "OnlyFans", group: "Support & sales", url: "https://onlyfans.com/{v}", placeholder: "Username" },
  cashapp: { label: "Cash App", group: "Support & sales", url: "https://cash.app/${v}", placeholder: "$cashtag" },
  venmo: { label: "Venmo", group: "Support & sales", url: "https://venmo.com/u/{v}", placeholder: "Username" },
  paypal: { label: "PayPal", group: "Support & sales", url: "https://paypal.me/{v}", placeholder: "PayPal.me name" },
  gumroad: { label: "Gumroad", group: "Support & sales", url: "https://{v}.gumroad.com", placeholder: "Username" },
  etsy: { label: "Etsy", group: "Support & sales", url: "https://etsy.com/shop/{v}", placeholder: "Shop name" },
  shopify: { label: "Shopify store", group: "Support & sales", placeholder: "Link to your store" },
  calendly: { label: "Calendly", group: "Work & portfolio", url: "https://calendly.com/{v}", placeholder: "Username" },
  github: { label: "GitHub", group: "Work & portfolio", url: "https://github.com/{v}", placeholder: "Username" },
  behance: { label: "Behance", group: "Work & portfolio", url: "https://behance.net/{v}", placeholder: "Username" },
  dribbble: { label: "Dribbble", group: "Work & portfolio", url: "https://dribbble.com/{v}", placeholder: "Username" },
  linktree: { label: "Linktree", group: "Work & portfolio", url: "https://linktr.ee/{v}", placeholder: "Username" },
  website: { label: "Website", group: "Contact", url: "https://{u}", placeholder: "yoursite.com" },
  email: { label: "Email", group: "Contact", placeholder: "you@example.com" },
  phone: { label: "Phone", group: "Contact", placeholder: "+1 555 123 4567" },
} satisfies Record<string, Platform>;

export type SocialKind = keyof typeof PLATFORMS;
export type SocialLink = { kind: SocialKind; value: string };

export const MAX_SOCIAL_LINKS = 30;
const LEGACY_ORDER: SocialKind[] = ["instagram", "tiktok", "youtube", "x", "website", "email"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSocialKind(k: unknown): k is SocialKind {
  return typeof k === "string" && Object.hasOwn(PLATFORMS, k);
}

// Stored as an ordered list; older stores saved an object like { instagram: "@me" }.
export function parseSocialLinks(raw: unknown): SocialLink[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? LEGACY_ORDER.map((kind) => ({ kind, value: (raw as Record<string, unknown>)[kind] }))
      : [];
  return list
    .map((l) => l as Partial<SocialLink>)
    .filter((l): l is SocialLink => isSocialKind(l?.kind) && typeof l.value === "string" && l.value.trim() !== "")
    .map((l) => ({ kind: l.kind, value: l.value.trim().slice(0, 200) }))
    .slice(0, MAX_SOCIAL_LINKS);
}

export function socialLinkError(l: SocialLink): string | null {
  if (l.kind === "email" && !EMAIL.test(l.value.replace(/^mailto:/i, ""))) return "Enter a valid email address";
  if ((l.kind === "phone" || l.kind === "whatsapp") && l.value.replace(/\D/g, "").length < 6 && !/^https?:\/\//.test(l.value)) {
    return `Enter a valid ${PLATFORMS[l.kind].label} number`;
  }
  return null;
}

export function socialHref({ kind, value }: SocialLink): string {
  const p: Platform = PLATFORMS[kind];
  if (kind === "email") return `mailto:${value.replace(/^mailto:/i, "")}`;
  if (kind === "phone") return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (!p.url) return `https://${value}`;
  return p.url
    .replace("{v}", encodeURI(value.replace(/^[@$]/, "")))
    .replace("{n}", value.replace(/\D/g, ""))
    .replace("{u}", value.replace(/^\/+/, ""));
}

// Official brand colors (Simple Icons data; LinkedIn from its brand guide). Website, Email and Phone have none.
export const BRAND_COLORS: Partial<Record<SocialKind, string>> = {
  instagram: "#FF0069", tiktok: "#000000", youtube: "#FF0000", x: "#000000", facebook: "#0866FF", threads: "#000000",
  snapchat: "#FFFC00", pinterest: "#BD081C", linkedin: "#0A66C2", reddit: "#FF4500", tumblr: "#36465D", bluesky: "#1185FE",
  mastodon: "#6364FF", twitch: "#9146FF", kick: "#53FC19", vimeo: "#1AB7EA", whatsapp: "#25D366", telegram: "#26A5E4",
  discord: "#5865F2", signal: "#3B45FD", spotify: "#1ED760", applemusic: "#FA243C", youtubemusic: "#FF0000",
  soundcloud: "#FF5500", applepodcasts: "#9933CC", patreon: "#000000", substack: "#FF6719", medium: "#000000",
  kofi: "#FF6433", buymeacoffee: "#FFDD00", onlyfans: "#00AFF0", cashapp: "#00C244", venmo: "#008CFF", paypal: "#002991",
  gumroad: "#FF90E8", etsy: "#F16521", shopify: "#7AB55C", calendly: "#006BFF", github: "#181717", behance: "#1769FF",
  dribbble: "#EA4C89", linktree: "#43E55E",
};
