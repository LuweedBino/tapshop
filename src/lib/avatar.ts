import type { CSSProperties } from "react";

// Profile photo edits are stored as settings (Creator.avatarStyle) and applied with CSS,
// so the original upload is never changed and the creator can re-edit at any time.

export const AVATAR_FILTERS = {
  none: { label: "Original", css: "" },
  bw: { label: "B&W", css: "grayscale(1) contrast(1.1)" },
  warm: { label: "Warm", css: "sepia(0.3) saturate(1.3) hue-rotate(-10deg)" },
  cool: { label: "Cool", css: "saturate(1.1) hue-rotate(15deg) brightness(1.03)" },
  vivid: { label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  vintage: { label: "Vintage", css: "sepia(0.55) contrast(0.9) brightness(1.05) saturate(0.8)" },
  fade: { label: "Fade", css: "contrast(0.8) brightness(1.1) saturate(0.7)" },
} as const;

export const AVATAR_SHAPES = {
  circle: { label: "Circle", radius: "9999px" },
  rounded: { label: "Rounded", radius: "28%" },
  square: { label: "Square", radius: "8%" },
} as const;

export const AVATAR_FRAMES = {
  white: { label: "White ring" },
  accent: { label: "Color ring" },
  glow: { label: "Glow" },
  none: { label: "No frame" },
} as const;

export const AVATAR_SIZES = {
  small: { label: "Small", px: 72 },
  medium: { label: "Medium", px: 96 },
  large: { label: "Large", px: 128 },
} as const;

export type AvatarStyle = {
  zoom: number; // 1 to 3
  x: number; // focus point, 0 to 100 (%)
  y: number;
  brightness: number; // 50 to 150 (%)
  filter: keyof typeof AVATAR_FILTERS;
  shape: keyof typeof AVATAR_SHAPES;
  frame: keyof typeof AVATAR_FRAMES;
  size: keyof typeof AVATAR_SIZES;
};

export const DEFAULT_AVATAR_STYLE: AvatarStyle = { zoom: 1, x: 50, y: 50, brightness: 100, filter: "none", shape: "circle", frame: "white", size: "medium" };

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const oneOf = <T extends object>(options: T, v: unknown, fallback: keyof T) => (typeof v === "string" && v in options ? (v as keyof T) : fallback);

// Accepts anything (stored JSON, form input) and returns a complete, safe style.
export function parseAvatarStyle(raw: unknown): AvatarStyle {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_AVATAR_STYLE;
  return {
    zoom: clamp(o.zoom, 1, 3, d.zoom),
    x: clamp(o.x, 0, 100, d.x),
    y: clamp(o.y, 0, 100, d.y),
    brightness: clamp(o.brightness, 50, 150, d.brightness),
    filter: oneOf(AVATAR_FILTERS, o.filter, d.filter),
    shape: oneOf(AVATAR_SHAPES, o.shape, d.shape),
    frame: oneOf(AVATAR_FRAMES, o.frame, d.frame),
    size: oneOf(AVATAR_SIZES, o.size, d.size),
  };
}

export function avatarFrameStyle(s: AvatarStyle, accent: string, size: number): CSSProperties {
  const ring = Math.max(2, Math.round(size / 24));
  const shadow = {
    white: `0 0 0 ${ring}px rgba(255,255,255,0.9)`,
    accent: `0 0 0 ${ring}px ${accent}`,
    glow: `0 0 ${Math.round(size / 5)}px ${Math.round(size / 24)}px ${accent}99`,
    none: "none",
  }[s.frame];
  return { width: size, height: size, borderRadius: AVATAR_SHAPES[s.shape].radius, boxShadow: shadow };
}

export function avatarImageStyle(s: AvatarStyle): CSSProperties {
  const filter = [AVATAR_FILTERS[s.filter].css, s.brightness !== 100 ? `brightness(${s.brightness / 100})` : ""].filter(Boolean).join(" ");
  return {
    objectPosition: `${s.x}% ${s.y}%`,
    transform: s.zoom !== 1 ? `scale(${s.zoom})` : undefined,
    transformOrigin: `${s.x}% ${s.y}%`,
    filter: filter || undefined,
  };
}
