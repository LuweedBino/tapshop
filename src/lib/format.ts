export function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function fileUrl(key: string | null | undefined) {
  return key ? `/api/files/${key}` : null;
}

export const RESERVED_HANDLES = new Set([
  "api", "dashboard", "login", "signup", "logout", "thanks", "d", "admin", "settings", "about", "pricing", "_next",
]);

