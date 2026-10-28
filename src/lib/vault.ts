export const VAULT_KINDS = {
  video: "Videos",
  image: "Images",
  audio: "Audio",
  document: "Documents",
  project: "Projects",
  other: "Other",
} as const;

export type VaultKind = keyof typeof VAULT_KINDS;
export type VaultSource = "upload" | "design" | "video";

export const VAULT_MAX_BYTES = 500 * 1024 * 1024; // the private upload limit in lib/storage.ts
export const VAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // total space per creator; change here to give more

const DOCUMENT = /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|md|key|pages|numbers|odt|ods|odp|epub|zip)$/i;

/** Sorts a file into a Vault group from its type and name. */
export function vaultKind(contentType: string, name: string): VaultKind {
  if (/\.tapshop(-design)?\.json$/i.test(name)) return "project";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("text/") || contentType.includes("pdf") || contentType.includes("document") || contentType.includes("sheet") || contentType.includes("presentation") || DOCUMENT.test(name)) return "document";
  return "other";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2).replace(/\.?0+$/, "")} GB`;
}
