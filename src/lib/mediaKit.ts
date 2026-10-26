// The content of a media kit, stored in MediaKit.data.
import { isSocialKind, PLATFORMS, type SocialKind } from "./socials";

export type KitStat = { kind: SocialKind; handle: string; followers: number; avgViews: number | null; engagement: number | null };
export type KitShare = { label: string; pct: number };
export type KitPartnership = { brand: string; logoKey: string; description: string; url: string };
export type KitService = { name: string; price: string; description: string };
export type KitData = {
  stats: KitStat[];
  /** Percent of the audience that are women, men and other. */
  gender: { women: number; men: number; other: number } | null;
  ages: KitShare[];
  locations: KitShare[];
  partnerships: KitPartnership[];
  services: KitService[];
  gallery: string[];
};

export const LIMITS = { stats: 10, ages: 6, locations: 6, partnerships: 12, services: 8, gallery: 9 };
export const KIT_SLUG = "media-kit";

/** Platforms that have followers worth showing a brand. */
export const STAT_PLATFORMS = (Object.keys(PLATFORMS) as SocialKind[]).filter((k) =>
  ["Social", "Video & streaming", "Music & podcasts"].includes(PLATFORMS[k].group) || ["substack", "patreon", "medium"].includes(k),
);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);

export function parseKit(value: unknown): KitData {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const g = v.gender && typeof v.gender === "object" ? (v.gender as Record<string, unknown>) : null;
  const shares = (x: unknown, max: number) => list(x).map((s) => ({ label: str(s.label), pct: num(s.pct) ?? 0 })).filter((s) => s.label).slice(0, max);
  return {
    stats: list(v.stats)
      .filter((s) => isSocialKind(s.kind))
      .map((s) => ({ kind: s.kind as SocialKind, handle: str(s.handle), followers: num(s.followers) ?? 0, avgViews: num(s.avgViews), engagement: num(s.engagement) }))
      .slice(0, LIMITS.stats),
    gender: g ? { women: num(g.women) ?? 0, men: num(g.men) ?? 0, other: num(g.other) ?? 0 } : null,
    ages: shares(v.ages, LIMITS.ages),
    locations: shares(v.locations, LIMITS.locations),
    partnerships: list(v.partnerships)
      .map((p) => ({ brand: str(p.brand), logoKey: str(p.logoKey), description: str(p.description), url: str(p.url) }))
      .filter((p) => p.brand)
      .slice(0, LIMITS.partnerships),
    services: list(v.services)
      .map((s) => ({ name: str(s.name), price: str(s.price), description: str(s.description) }))
      .filter((s) => s.name)
      .slice(0, LIMITS.services),
    gallery: (Array.isArray(v.gallery) ? v.gallery.filter((k): k is string => typeof k === "string" && k !== "") : []).slice(0, LIMITS.gallery),
  };
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
