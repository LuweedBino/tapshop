/**
 * A Content-Disposition value that works for any file name. Headers only carry plain ASCII,
 * so a name with an emoji, a dash like "—" or an accent made the response throw (HTTP 500).
 * `filename` is a plain stand-in for old browsers; the others use the full name in `filename*`.
 */
export function contentDisposition(type: "inline" | "attachment", name: string) {
  const full = name.replace(/[\r\n"\\]/g, "").trim() || "file";
  const ext = full.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
  const plain = full.slice(0, full.length - ext.length).normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
  const encoded = encodeURIComponent(full).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return `${type}; filename="${(plain || "file") + ext}"; filename*=UTF-8''${encoded}`;
}
