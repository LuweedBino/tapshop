"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";
import { addVaultItems, createVaultFolder, deleteVaultFolder, deleteVaultItem, moveVaultItems, renameVaultFolder } from "@/app/actions/vault";
import { formatBytes, VAULT_KINDS, VAULT_MAX_BYTES, type VaultKind } from "@/lib/vault";

export type VaultItemView = { id: string; name: string; kind: string; size: number; contentType: string; source: string; folderId: string | null; createdAt: string };
export type VaultFolderView = { id: string; name: string };

const ICONS: Record<string, string> = { video: "▶", image: "🖼", audio: "♫", document: "📄", project: "✳", other: "📦" };
const SOURCE_LABEL: Record<string, string> = { upload: "Uploaded", design: "From Design Studio", video: "From Video Studio" };

/** Uploads files privately and records them in the Vault. Shared by the Vault and Studio exports. */
export async function saveToVault(files: { file: File; source: "upload" | "design" | "video" }[], onProgress?: (done: number) => void, folderId?: string | null) {
  const items = [];
  let done = 0;
  for (const { file, source } of files) {
    if (file.size > VAULT_MAX_BYTES) throw new Error(`${file.name} is over the ${formatBytes(VAULT_MAX_BYTES)} limit`);
    const key = await uploadFile(file, "private");
    items.push({ key, name: file.name, contentType: file.type || "application/octet-stream", size: file.size, source });
    onProgress?.(++done);
  }
  for (let i = 0; i < items.length; i += 50) {
    const result = await addVaultItems(items.slice(i, i + 50), folderId);
    if (result.error) throw new Error(result.error);
  }
  return items.length;
}

const USABLE = new Set(["video", "audio", "image", "project"]);

const ALL = "all", LOOSE = "none";

export function MediaVault({ items, folders, onBack, onExportDesigns, canExportDesigns, onUse }: { items: VaultItemView[]; folders: VaultFolderView[]; onBack: () => void; onExportDesigns: () => void; canExportDesigns: boolean; onUse: (item: VaultItemView) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | VaultKind>("all");
  const [place, setPlace] = useState<string>(ALL);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [naming, setNaming] = useState<"new" | "rename" | null>(null);
  const [draft, setDraft] = useState("");
  const [dropOn, setDropOn] = useState<string | null>(null);
  const folder = folders.find((f) => f.id === place) ?? null;
  const here = place === ALL || (place !== LOOSE && !folder) ? items : items.filter((i) => (place === LOOSE ? !i.folderId : i.folderId === place));
  const shown = filter === "all" ? here : here.filter((i) => i.kind === filter);
  const total = items.reduce((n, i) => n + i.size, 0);
  const counts = here.reduce<Record<string, number>>((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});
  const inFolder = items.reduce<Record<string, number>>((m, i) => (i.folderId && (m[i.folderId] = (m[i.folderId] ?? 0) + 1), m), {});
  const loose = items.filter((i) => !i.folderId).length;

  async function run(action: () => Promise<{ error?: string }>) {
    setError("");
    const result = await action();
    if (result.error) setError(result.error);
    else router.refresh();
    return !result.error;
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (naming === "new") {
      setError("");
      const result = await createVaultFolder(draft);
      if (result.error) return setError(result.error);
      if (result.id) { setPlace(result.id); setFilter("all"); }
      router.refresh();
    } else if (naming === "rename" && folder) {
      if (!(await run(() => renameVaultFolder(folder.id, draft)))) return;
    }
    setNaming(null);
  }

  async function removeFolder() {
    if (!folder || !confirm(`Delete the folder “${folder.name}”? The files in it stay in your Media Vault.`)) return;
    if (await run(() => deleteVaultFolder(folder.id))) setPlace(ALL);
  }

  function move(ids: string[], to: string) {
    if (!ids.length) return;
    run(() => moveVaultItems(ids, to === LOOSE ? null : to));
  }

  function chip(id: string, label: string, active: boolean) {
    const target = id !== ALL;
    return (
      <button
        key={id}
        type="button"
        onClick={() => { setPlace(id); setFilter("all"); setNaming(null); }}
        onDragOver={target ? (e) => { if (e.dataTransfer.types.includes("application/x-vault-item")) { e.preventDefault(); e.stopPropagation(); setDropOn(id); } } : undefined}
        onDragLeave={target ? () => setDropOn(null) : undefined}
        onDrop={target ? (e) => { const ids = e.dataTransfer.getData("application/x-vault-item"); if (!ids) return; e.preventDefault(); e.stopPropagation(); setDropOn(null); move(ids.split(","), id); } : undefined}
        className={`whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold ${active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"} ${dropOn === id ? "ring-2 ring-violet-500" : ""}`}
      >
        {label}
      </button>
    );
  }

  async function upload(list: FileList | File[] | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setError("");
    try {
      setBusy(`Uploading 0 of ${files.length}…`);
      await saveToVault(files.map((file) => ({ file, source: "upload" as const })), (d) => setBusy(`Uploading ${d} of ${files.length}…`), folder?.id ?? null);
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
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
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

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Folders">
        {chip(ALL, `🗂 All files (${items.length})`, place === ALL)}
        {folders.length > 0 && chip(LOOSE, `Not in a folder (${loose})`, place === LOOSE)}
        {folders.map((f) => chip(f.id, `📁 ${f.name} (${inFolder[f.id] ?? 0})`, place === f.id))}
        <button type="button" onClick={() => { setNaming("new"); setDraft(""); }} className="whitespace-nowrap rounded-xl border border-dashed border-neutral-400 px-3.5 py-2 text-sm font-semibold text-neutral-600">＋ New folder</button>
      </div>

      {naming && (
        <form onSubmit={saveName} className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-100 p-3">
          <label className="text-sm font-semibold" htmlFor="vault-folder-name">{naming === "new" ? "New folder" : "Rename folder"}</label>
          <input id="vault-folder-name" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} placeholder="e.g. Brand deals" className="input min-w-0 flex-1" />
          <button type="submit" className="btn" disabled={!draft.trim()}>{naming === "new" ? "Create" : "Save"}</button>
          <button type="button" className="btn-secondary" onClick={() => setNaming(null)}>Cancel</button>
        </form>
      )}

      {folder && !naming && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold">📁 {folder.name}</h2>
          <button type="button" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900" onClick={() => { setNaming("rename"); setDraft(folder.name); }}>Rename</button>
          <button type="button" className="text-sm font-semibold text-red-600 hover:text-red-700" onClick={removeFolder}>Delete folder</button>
          <span className="text-xs text-neutral-500">New uploads go into this folder.</span>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(["all", ...Object.keys(VAULT_KINDS)] as ("all" | VaultKind)[]).map((k) => (
          (k === "all" || counts[k]) ? (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${filter === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600"}`}>
              {k === "all" ? `All (${here.length})` : `${VAULT_KINDS[k]} (${counts[k]})`}
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
      ) : here.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-6 py-12 text-center">
          <span className="text-3xl">📂</span>
          <span className="font-semibold">{folder ? "This folder is empty" : "Every file is in a folder"}</span>
          {folder && <span className="max-w-sm text-sm text-neutral-500">Upload files here, or use “Move to” on any file.</span>}
        </button>
      ) : (
        <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${dragging ? "opacity-60" : ""}`}>
          {shown.map((item) => (
            <li key={item.id} draggable={folders.length > 0} onDragStart={(e) => { e.dataTransfer.setData("application/x-vault-item", item.id); e.dataTransfer.effectAllowed = "move"; }} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
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
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                  {USABLE.has(item.kind) && (
                    <button type="button" onClick={() => onUse(item)} className="text-violet-700 hover:text-violet-900" title={item.kind === "image" ? "Add to your design" : item.kind === "project" ? "Open this project in Studio" : "Add to your video"}>
                      Use in Studio
                    </button>
                  )}
                  <a href={`/api/vault/${item.id}?download=1`} className="text-neutral-700 hover:text-neutral-900">Download</a>
                  <button type="button" onClick={() => remove(item)} className="text-red-600 hover:text-red-700">Delete</button>
                </div>
                {folders.length > 0 && (
                  <select
                    aria-label={`Move ${item.name} to a folder`}
                    value=""
                    onChange={(e) => move([item.id], e.target.value)}
                    className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700"
                  >
                    <option value="" disabled>📁 Move to… {item.folderId ? `(in ${folders.find((f) => f.id === item.folderId)?.name ?? "a folder"})` : ""}</option>
                    {item.folderId && <option value={LOOSE}>Take out of the folder</option>}
                    {folders.filter((f) => f.id !== item.folderId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-neutral-500">Up to {formatBytes(VAULT_MAX_BYTES)} per file. Files are private: links only work while you&apos;re signed in.</p>
    </div>
  );
}
