import type { CSSProperties } from "react";
import { onColor } from "./design";
import { BRAND_COLORS, type SocialKind } from "./socials";

// How social link buttons look and move. Stored as Creator.socialIconStyle (JSON) and
// validated here, so unknown or old values always fall back to today's look.

export const ICON_SHAPES = {
  circle: { label: "Circle" },
  rounded: { label: "Rounded" },
  square: { label: "Square" },
  blob: { label: "Blob" },
  hexagon: { label: "Hexagon" },
  none: { label: "Icon only" },
} as const;

export const ICON_FILLS = {
  soft: { label: "Soft" },
  solid: { label: "Solid" },
  outline: { label: "Outline" },
} as const;

export const ICON_COLORS = {
  theme: { label: "Match theme" },
  accent: { label: "Accent color" },
  brand: { label: "Brand colors" },
  custom: { label: "Custom" },
} as const;

export const ICON_SIZES = {
  small: { label: "Small", px: 34 },
  medium: { label: "Medium", px: 40 },
  large: { label: "Large", px: 52 },
} as const;

export const ICON_HOVERS = {
  lift: { label: "Lift" },
  grow: { label: "Grow" },
  glow: { label: "Glow" },
  wiggle: { label: "Wiggle" },
  none: { label: "None" },
} as const;

export const ICON_ENTRANCES = {
  none: { label: "None" },
  fade: { label: "Fade in" },
  pop: { label: "Pop" },
  slide: { label: "Slide up" },
} as const;

export const ICON_MOTIONS = {
  none: { label: "Still" },
  float: { label: "Float" },
  pulse: { label: "Pulse" },
} as const;

export type IconStyle = {
  shape: keyof typeof ICON_SHAPES;
  fill: keyof typeof ICON_FILLS;
  color: keyof typeof ICON_COLORS;
  customColor: string;
  size: keyof typeof ICON_SIZES;
  hover: keyof typeof ICON_HOVERS;
  entrance: keyof typeof ICON_ENTRANCES;
  motion: keyof typeof ICON_MOTIONS;
};

export const DEFAULT_ICON_STYLE: IconStyle = {
  shape: "circle",
  fill: "soft",
  color: "theme",
  customColor: "#171717",
  size: "medium",
  hover: "lift",
  entrance: "none",
  motion: "none",
};

const oneOf = <T extends object>(options: T, v: unknown, fallback: keyof T) => (typeof v === "string" && Object.hasOwn(options, v) ? (v as keyof T) : fallback);

export function parseIconStyle(raw: unknown): IconStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_ICON_STYLE;
  return {
    shape: oneOf(ICON_SHAPES, o.shape, d.shape),
    fill: oneOf(ICON_FILLS, o.fill, d.fill),
    color: oneOf(ICON_COLORS, o.color, d.color),
    customColor: typeof o.customColor === "string" && /^#[0-9a-fA-F]{6}$/.test(o.customColor) ? o.customColor : d.customColor,
    size: oneOf(ICON_SIZES, o.size, d.size),
    hover: oneOf(ICON_HOVERS, o.hover, d.hover),
    entrance: oneOf(ICON_ENTRANCES, o.entrance, d.entrance),
    motion: oneOf(ICON_MOTIONS, o.motion, d.motion),
  };
}

const RADIUS: Record<IconStyle["shape"], { icon: string; pill: string }> = {
  circle: { icon: "9999px", pill: "9999px" },
  rounded: { icon: "30%", pill: "12px" },
  square: { icon: "12%", pill: "6px" },
  blob: { icon: "42% 58% 63% 37% / 41% 44% 56% 59%", pill: "9999px" },
  hexagon: { icon: "0", pill: "9999px" },
  none: { icon: "0", pill: "0" },
};
const HEXAGON = "polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)";

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

/** The one color a link uses, before fill is applied. */
function linkColor(s: IconStyle, kind: SocialKind, accent: string, dark: boolean): string | null {
  if (s.color === "theme") return null;
  if (s.color === "accent") return accent;
  if (s.color === "custom") return s.customColor;
  const brand = BRAND_COLORS[kind] ?? accent;
  // Near-black brand marks (TikTok, X, GitHub...) would vanish on a dark page unless they sit on a fill.
  return dark && s.fill !== "solid" && luminance(brand) < 60 ? "#ffffff" : brand;
}

/** Inline styles for one link button. `iconOnly` buttons are square; text pills size to content. */
export function iconButtonStyle(s: IconStyle, kind: SocialKind, accent: string, dark: boolean, iconOnly: boolean): CSSProperties {
  const color = linkColor(s, kind, accent, dark);
  const px = ICON_SIZES[s.size].px;
  const box: CSSProperties = iconOnly
    ? { width: px, height: px, borderRadius: RADIUS[s.shape].icon, clipPath: s.shape === "hexagon" ? HEXAGON : undefined }
    : { borderRadius: RADIUS[s.shape].pill };
  const glow = { "--si": color ?? "var(--card-text)" } as CSSProperties;

  if (s.shape === "none") return { ...box, ...glow, color: color ?? "var(--page-text)", background: "transparent", border: "none" };
  if (s.fill === "solid") {
    const bg = color ?? "var(--card-text)";
    return { ...box, ...glow, background: bg, color: color ? onColor(color) : "var(--card)", borderColor: "transparent" };
  }
  if (s.fill === "outline") {
    return { ...box, ...glow, background: "transparent", color: color ?? "var(--page-text)", borderColor: color ?? "var(--page-text)", borderWidth: 2 };
  }
  return { ...box, ...glow, color: color ?? "var(--card-text)" };
}

export function iconGlyphSize(s: IconStyle) {
  return Math.round(ICON_SIZES[s.size].px * 0.45);
}
