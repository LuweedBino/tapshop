"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";
import { addVaultItems, deleteVaultItem } from "@/app/actions/vault";
import { formatBytes, VAULT_KINDS, VAULT_MAX_BYTES, type VaultKind } from "@/lib/vault";

export type VaultItemView = { id: string; name: string; kind: string; size: number; contentType: string; source: string; createdAt: string };

const ICONS: Record<string, string> = { video: "▶", image: "🖼", audio: "♫", document: "📄", project: "✳", other: "📦" };
const SOURCE_LABEL: Record<string, string> = { upload: "Uploaded", design: "From Design Studio", video: "From Video Studio" };

/** Uploads files privately and records them in the Vault. Shared by the Vault and Studio exports. */
export async function saveToVault(files: { file: File; source: "upload" | "design" | "video" }[], onProgress?: (done: number) => void) {
  const items = [];
  let done = 0;
  for (const { file, source } of files) {
    if (file.size > VAULT_MAX_BYTES) throw new Error(`${file.name} is over the ${formatBytes(VAULT_MAX_BYTES)} limit`);
    const key = await uploadFile(file, "private");
    items.push({ key, name: file.name, contentType: file.type || "application/octet-stream", size: file.size, source });
    onProgress?.(++done);
  }
  for (let i = 0; i < items.length; i += 50) {
    const result = await addVaultItems(items.slice(i, i + 50));
    if (result.error) throw new Error(result.error);
  }
  return items.length;
}

export function MediaVault({ items, onBack, onExportDesigns, canExportDesigns }: { items: VaultItemView[]; onBack: () => void; onExportDesigns: () => void; canExportDesigns: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | VaultKind>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const shown = useMemo(() => (filter === "all" ? items : items.filter((i) => i.kind === filter)), [items, filter]);
  const total = items.reduce((n, i) => n + i.size, 0);
  const counts = items.reduce<Record<string, number>>((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});

  async function upload(list: FileList | File[] | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setError("");
    try {
      setBusy(`Uploading 0 of ${files.length}…`);
      await saveToVault(files.map((file) => ({ file, source: "upload" as const })), (d) => setBusy(`Uploading ${d} of ${files.length}…`));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy("");
    }
  }

  async function remove(item: VaultItemView) {
    if (!confirm(`Delete “${item.name}” from your Media Vault? This can't be undone.`)) return;
    const result = await deleteVaultItem(item.id);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div
      className="min-h-[600px] rounded-xl border border-neutral-200 bg-white p-4 md:p-6"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900">← Back to Studio</button>
          <h1 className="text-2xl font-bold tracking-tight">Media Vault</h1>
          <p className="text-sm text-neutral-500">{items.length} files · {formatBytes(total)} · only you can see these</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={onExportDesigns} disabled={!canExportDesigns || !!busy} title={canExportDesigns ? "Save every Design Studio project here" : "Open the Studio home first"}>
            ✳ Export all designs
          </button>
          <button type="button" className="btn" onClick={() => input.current?.click()} disabled={!!busy}>＋ Upload files</button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(["all", ...Object.keys(VAULT_KINDS)] as ("all" | VaultKind)[]).map((k) => (
          (k === "all" || counts[k]) ? (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${filter === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600"}`}>
              {k === "all" ? `All (${items.length})` : `${VAULT_KINDS[k]} (${counts[k]})`}
            </button>
          ) : null
        ))}
      </div>

      {busy && <p className="mb-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium">{busy}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {items.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-16 text-center ${dragging ? "border-neutral-900 bg-neutral-50" : "border-neutral-300"}`}>
          <span className="text-3xl">🗄</span>
          <span className="font-semibold">Your Media Vault is empty</span>
          <span className="max-w-sm text-sm text-neutral-500">Upload videos, images, music and documents, or use “Save to Vault” in the Design and Video Studio. Drop files here or tap to choose.</span>
        </button>
      ) : (
        <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${dragging ? "opacity-60" : ""}`}>
          {shown.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <a href={`/api/vault/${item.id}`} target="_blank" rel="noopener" className="block aspect-video bg-neutral-100">
                {item.kind === "image" && !item.contentType.includes("svg") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/vault/${item.id}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : item.kind === "video" ? (
                  <video src={`/api/vault/${item.id}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-3xl">{ICONS[item.kind] ?? ICONS.other}</span>
                )}
              </a>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold" title={item.name}>{item.name}</p>
                <p className="truncate text-xs text-neutral-500">{formatBytes(item.size)} · {SOURCE_LABEL[item.source] ?? "Uploaded"}</p>
                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  <a href={`/api/vault/${item.id}?download=1`} className="text-neutral-700 hover:text-neutral-900">Download</a>
                  <button type="button" onClick={() => remove(item)} className="text-red-600 hover:text-red-700">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-neutral-500">Up to {formatBytes(VAULT_MAX_BYTES)} per file. Files are private: links only work while you&apos;re signed in.</p>
    </div>
  );
}
