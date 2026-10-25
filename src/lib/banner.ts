import type { CSSProperties } from "react";
import { AVATAR_FILTERS } from "./avatar";
import { bannerPresetSrc, isBannerPreset, type BannerPresetId } from "./bannerGallery";
import { fileUrl } from "./format";

// Banner edits are stored as settings (Creator.bannerStyle) and applied with CSS, like the
// profile photo, so the original image is never changed.

export const BANNER_SOURCES = {
  upload: { label: "My image" },
  gallery: { label: "Gallery" },
  none: { label: "No banner" },
} as const;

export const BANNER_HEIGHTS = {
  short: { label: "Short", ratio: "4 / 1" },
  medium: { label: "Medium", ratio: "3 / 1" },
  tall: { label: "Tall", ratio: "2 / 1" },
  hero: { label: "Extra tall", ratio: "4 / 3" },
} as const;

export const BANNER_LAYOUTS = {
  full: { label: "Edge to edge" },
  inset: { label: "Floating card" },
} as const;

// Bottom edge shapes, drawn as an SVG mask stretched over the banner.
export const BANNER_EDGES = {
  straight: { label: "Straight", path: "" },
  curve: { label: "Curve", path: "M0 0H100V82Q50 112 0 82Z" },
  wave: { label: "Wave", path: "M0 0H100V86C83 100 67 72 50 86S17 100 0 86Z" },
  slant: { label: "Slant", path: "M0 0H100V76L0 100Z" },
  zigzag: { label: "Zigzag", path: `M0 0H100V90${Array.from({ length: 10 }, (_, i) => `L${95 - i * 10} ${i % 2 ? 90 : 100}`).join("")}L0 90Z` },
  fade: { label: "Fade out", path: "" },
} as const;

export const BANNER_OVERLAYS = {
  none: { label: "None" },
  darken: { label: "Darken" },
  lighten: { label: "Lighten" },
  tint: { label: "Color tint" },
  gradient: { label: "Color gradient" },
  vignette: { label: "Vignette" },
} as const;

export const BANNER_PATTERNS = {
  none: { label: "None" },
  dots: { label: "Dots" },
  grid: { label: "Grid" },
  lines: { label: "Lines" },
  grain: { label: "Film grain" },
} as const;

export const BANNER_MOTIONS = {
  none: { label: "None" },
  zoom: { label: "Slow zoom" },
  drift: { label: "Drift" },
  sway: { label: "Sway" },
} as const;

export const BANNER_AVATAR = {
  overlap: { label: "Overlap banner" },
  below: { label: "Below banner" },
  inside: { label: "Inside banner" },
} as const;

export type BannerStyle = {
  source: keyof typeof BANNER_SOURCES;
  preset: BannerPresetId;
  zoom: number; // 1 to 3
  x: number; // focus point, 0 to 100 (%)
  y: number;
  brightness: number; // 50 to 150 (%)
  blur: number; // 0 to 12 (px)
  filter: keyof typeof AVATAR_FILTERS;
  height: keyof typeof BANNER_HEIGHTS;
  layout: keyof typeof BANNER_LAYOUTS;
  edge: keyof typeof BANNER_EDGES;
  overlay: keyof typeof BANNER_OVERLAYS;
  overlayStrength: number; // 0 to 100 (%)
  pattern: keyof typeof BANNER_PATTERNS;
  motion: keyof typeof BANNER_MOTIONS;
  motionSpeed: number; // 0.25 to 3
  avatar: keyof typeof BANNER_AVATAR;
};

export const DEFAULT_BANNER_STYLE: BannerStyle = {
  source: "upload",
  preset: "glow",
  zoom: 1,
  x: 50,
  y: 50,
  brightness: 100,
  blur: 0,
  filter: "none",
  height: "medium",
  layout: "full",
  edge: "straight",
  overlay: "none",
  overlayStrength: 40,
  pattern: "none",
  motion: "none",
  motionSpeed: 1,
  avatar: "overlap",
};

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const oneOf = <T extends object>(options: T, v: unknown, fallback: keyof T) => (typeof v === "string" && v in options ? (v as keyof T) : fallback);

// Accepts anything (stored JSON, form input) and returns a complete, safe style.
export function parseBannerStyle(raw: unknown): BannerStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_BANNER_STYLE;
  return {
    source: oneOf(BANNER_SOURCES, o.source, d.source),
    preset: isBannerPreset(o.preset) ? o.preset : d.preset,
    zoom: clamp(o.zoom, 1, 3, d.zoom),
    x: clamp(o.x, 0, 100, d.x),
    y: clamp(o.y, 0, 100, d.y),
    brightness: clamp(o.brightness, 50, 150, d.brightness),
    blur: clamp(o.blur, 0, 12, d.blur),
    filter: oneOf(AVATAR_FILTERS, o.filter, d.filter),
    height: oneOf(BANNER_HEIGHTS, o.height, d.height),
    layout: oneOf(BANNER_LAYOUTS, o.layout, d.layout),
    edge: oneOf(BANNER_EDGES, o.edge, d.edge),
    overlay: oneOf(BANNER_OVERLAYS, o.overlay, d.overlay),
    overlayStrength: clamp(o.overlayStrength, 0, 100, d.overlayStrength),
    pattern: oneOf(BANNER_PATTERNS, o.pattern, d.pattern),
    motion: oneOf(BANNER_MOTIONS, o.motion, d.motion),
    motionSpeed: clamp(o.motionSpeed, 0.25, 3, d.motionSpeed),
    avatar: oneOf(BANNER_AVATAR, o.avatar, d.avatar),
  };
}

// The image to show, or null when there is no banner.
export function bannerSrc(s: BannerStyle, bannerKey: string | null | undefined, accent: string) {
  if (s.source === "gallery") return bannerPresetSrc(s.preset, accent);
  if (s.source === "upload") return fileUrl(bannerKey);
  return null;
}

const svgUrl = (body: string, view = "0 0 100 100") =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" preserveAspectRatio="none">${body}</svg>`)}")`;

export function bannerFrameStyle(s: BannerStyle): CSSProperties {
  const edge = BANNER_EDGES[s.edge].path;
  const mask = s.edge === "fade" ? "linear-gradient(#000 55%, transparent)" : edge ? svgUrl(`<path d="${edge}"/>`) : undefined;
  return {
    aspectRatio: BANNER_HEIGHTS[s.height].ratio,
    borderRadius: s.layout === "inset" ? "var(--card-radius)" : undefined,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    "--bn-s": s.motionSpeed,
  } as CSSProperties;
}

export function bannerImageStyle(s: BannerStyle): CSSProperties {
  const filter = [AVATAR_FILTERS[s.filter].css, s.brightness !== 100 ? `brightness(${s.brightness / 100})` : "", s.blur ? `blur(${s.blur}px)` : ""].filter(Boolean).join(" ");
  // Blur pulls in the transparent edge, so scale up slightly to hide it.
  const zoom = s.zoom * (s.blur ? 1 + s.blur / 100 : 1);
  return {
    objectPosition: `${s.x}% ${s.y}%`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    transformOrigin: `${s.x}% ${s.y}%`,
    filter: filter || undefined,
  };
}

export function bannerOverlayStyle(s: BannerStyle, accent: string): CSSProperties | null {
  const a = s.overlayStrength / 100;
  const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  switch (s.overlay) {
    case "darken":
      return { background: `rgba(0,0,0,${a})` };
    case "lighten":
      return { background: `rgba(255,255,255,${a})` };
    case "tint":
      return { background: accent, opacity: a, mixBlendMode: "color" };
    case "gradient":
      return { background: `linear-gradient(135deg, ${accent}${hex(Math.min(1, a * 1.6))} 0%, transparent 75%)` };
    case "vignette":
      return { background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${Math.min(1, a * 1.8)}) 100%)` };
    default:
      return null;
  }
}

export function bannerPatternStyle(s: BannerStyle): CSSProperties | null {
  const ink = "rgba(255,255,255,0.35)";
  switch (s.pattern) {
    case "dots":
      return { backgroundImage: `radial-gradient(${ink} 1.5px, transparent 1.6px)`, backgroundSize: "14px 14px" };
    case "grid":
      return { backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`, backgroundSize: "22px 22px" };
    case "lines":
      return { backgroundImage: `repeating-linear-gradient(45deg, ${ink} 0 1.5px, transparent 1.5px 10px)` };
    case "grain":
      return {
        backgroundImage: svgUrl(`<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)"/>`, "0 0 200 200"),
        backgroundSize: "200px 200px",
        opacity: 0.35,
        mixBlendMode: "overlay",
      };
    default:
      return null;
  }
}
