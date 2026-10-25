// Store page links: /<handle>/<slug>.
export const SLUG_PATTERN = "[a-z0-9](?:[a-z0-9\\-]{0,38}[a-z0-9])?";
export const SLUG_RE = new RegExp(`^${SLUG_PATTERN}$`);

/** "Summer Sale!" → "summer-sale" */
export function slugify(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}
