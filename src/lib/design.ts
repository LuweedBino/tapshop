import type { CSSProperties } from "react";
import type { Creator } from "@prisma/client";

// Storefront design options. Each choice is stored as a plain string on Creator;
// unknown values fall back to the first option so old rows and bad input still render.

export const THEMES = {
  soft: { label: "Soft", hint: "Light with a hint of your color" },
  clean: { label: "Clean", hint: "Plain white" },
  dark: { label: "Dark", hint: "Black background" },
  bold: { label: "Bold", hint: "Your color, full page" },
} as const;

export const FONTS = {
  modern: { label: "Modern", hint: "Clean and simple" },
  elegant: { label: "Elegant", hint: "Classic serif" },
  friendly: { label: "Friendly", hint: "Soft and round" },
  techy: { label: "Techy", hint: "Sharp and geometric" },
} as const;

export const BUTTON_STYLES = {
  rounded: { label: "Rounded" },
  pill: { label: "Pill" },
  square: { label: "Square" },
} as const;

export const LAYOUTS = {
  card: { label: "Cards", hint: "Small image beside the title" },
  large: { label: "Big image", hint: "Full-width cover on top" },
  compact: { label: "Buttons", hint: "One slim row per product" },
} as const;

export type Theme = keyof typeof THEMES;
export type Font = keyof typeof FONTS;
export type ButtonStyle = keyof typeof BUTTON_STYLES;
export type Layout = keyof typeof LAYOUTS;

export type Design = { accentColor: string; theme: Theme; font: Font; buttonStyle: ButtonStyle; layout: Layout };
export type DesignInput = Pick<Creator, "accentColor" | "theme" | "font" | "buttonStyle" | "layout">;

function pick<T extends object>(options: T, value: string): keyof T {
  return (value in options ? value : Object.keys(options)[0]) as keyof T;
}

export function designOf(c: DesignInput): Design {
  return {
    accentColor: c.accentColor,
    theme: pick(THEMES, c.theme),
    font: pick(FONTS, c.font),
    buttonStyle: pick(BUTTON_STYLES, c.buttonStyle),
    layout: pick(LAYOUTS, c.layout),
  };
}

// Black or white, whichever reads better on the given hex color.
export function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? "#171717" : "#ffffff";
}

const RADIUS: Record<ButtonStyle, { card: string; btn: string }> = {
  rounded: { card: "1rem", btn: "0.75rem" },
  pill: { card: "1.75rem", btn: "9999px" },
  square: { card: "0.25rem", btn: "0.25rem" },
};

// CSS variables the storefront components read (var(--page-text), var(--card), ...).
export function designVars(d: Design, fadeAt = 320): CSSProperties {
  const a = d.accentColor;
  const page = {
    soft: { bg: `linear-gradient(180deg, ${a}22 0%, #fafafa ${fadeAt}px)`, text: "#171717", muted: "#525252" },
    clean: { bg: "#ffffff", text: "#171717", muted: "#525252" },
    dark: { bg: `linear-gradient(180deg, ${a}33 0%, #0a0a0a ${fadeAt}px)`, text: "#fafafa", muted: "#a3a3a3" },
    bold: { bg: a, text: onColor(a), muted: onColor(a) === "#ffffff" ? "#ffffffcc" : "#171717bb" },
  }[d.theme];
  const card =
    d.theme === "dark"
      ? { bg: "#171717", border: "#262626", text: "#fafafa", muted: "#a3a3a3" }
      : { bg: "#ffffff", border: d.theme === "bold" ? "transparent" : "#e5e5e5", text: "#171717", muted: "#737373" };
  return {
    "--accent": a,
    "--on-accent": onColor(a),
    "--page-bg": page.bg,
    "--page-text": page.text,
    "--page-muted": page.muted,
    "--card": card.bg,
    "--card-border": card.border,
    "--card-text": card.text,
    "--card-muted": card.muted,
    "--card-radius": RADIUS[d.buttonStyle].card,
    "--btn-radius": RADIUS[d.buttonStyle].btn,
    background: page.bg,
    color: page.text,
  } as CSSProperties;
}
