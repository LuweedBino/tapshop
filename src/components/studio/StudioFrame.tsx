"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveToTapShop, type StudioImage } from "./SaveToTapShop";
import { MediaVault, saveToVault, type VaultFolderView, type VaultItemView } from "./MediaVault";
import { VAULT_MAX_BYTES } from "@/lib/vault";

type VaultFile = { file: File; source: "design" | "video" };

// Reads one item of a `tapshop:vault-save` message; anything malformed is dropped.
function vaultFile(x: unknown): VaultFile | null {
  if (!x || typeof x !== "object") return null;
  const { blob, name, source } = x as { blob?: unknown; name?: unknown; source?: unknown };
  if (!(blob instanceof Blob) || blob.size === 0 || blob.size > VAULT_MAX_BYTES) return null;
  if (typeof name !== "string" || !name.trim()) return null;
  return { file: new File([blob], name.trim().slice(0, 200), { type: blob.type || "application/octet-stream" }), source: source === "video" ? "video" : "design" };
}

// The original static editor runs in an iframe so its CSS and global scripts stay out of
// the app. Keep src stable: remounting the iframe drops unsaved in-memory video edits, so
// the Media Vault is shown beside it (with the iframe hidden) rather than replacing it.
// allow-modals is needed for the "custom size" prompt in the design studio.
export function StudioFrame({ products, vault, folders }: { products: { id: string; title: string }[]; vault: VaultItemView[]; folders: VaultFolderView[] }) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [image, setImage] = useState<StudioImage | null>(null);
  const [view, setView] = useState<"studio" | "vault">("studio");
  const [onDesignHome, setOnDesignHome] = useState(false);
  const [saving, setSaving] = useState<{ text: string; done?: boolean; error?: boolean } | null>(null);

  function frameOn(page: string) {
    try {
      return frame.current?.contentWindow?.location.pathname.endsWith(page) ?? false;
    } catch {
      return false;
    }
  }

  function openVault() {
    setOnDesignHome(frameOn("/index.html"));
    setView("vault");
  }

  async function store(files: VaultFile[]) {
    if (!files.length) return;
    try {
      setSaving({ text: `Saving 0 of ${files.length} to your Media Vault…` });
      await saveToVault(files, (d) => setSaving({ text: `Saving ${d} of ${files.length} to your Media Vault…` }));
      setSaving({ text: `Saved ${files.length} ${files.length === 1 ? "file" : "files"} to your Media Vault`, done: true });
      router.refresh();
    } catch (e) {
      setSaving({ text: e instanceof Error ? e.message : "Couldn't save to the Media Vault", done: true, error: true });
    }
  }

  useEffect(() => {
    // Only trust messages from our own Studio iframe, in the shapes version 1 defines.
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (!d || d.version !== 1) return;
      if (d.type === "tapshop:open-vault") return openVault();
      if (d.type === "tapshop:vault-save" && Array.isArray(d.items)) {
        const files = d.items.slice(0, 200).map(vaultFile).filter((f: VaultFile | null): f is VaultFile => !!f);
        store(files);
        return;
      }
      if (d.type !== "tapshop:export-ready" || d.kind !== "image") return;
      if (!(d.blob instanceof Blob) || d.blob.type !== "image/png" || d.blob.size === 0) return;
      const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 100) : "Studio design";
      const width = Number(d.width), height = Number(d.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      setImage({ blob: d.blob, name, width, height });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Use in Studio": go back to the editor and let the page that's open import the file.
  // The editor fetches it by id, so the server still checks it belongs to this creator.
  function useInStudio(item: VaultItemView) {
    setView("studio");
    frame.current?.contentWindow?.postMessage({ type: "tapshop:vault-import", version: 1, item: { id: item.id, name: item.name, kind: item.kind, contentType: item.contentType } }, window.location.origin);
  }

  function exportDesigns() {
    if (!frameOn("/index.html")) return;
    frame.current?.contentWindow?.postMessage({ type: "tapshop:vault-export-all", version: 1 }, window.location.origin);
  }

  return (
    <>
      <iframe
        ref={frame}
        title="TapShop Studio"
        src="/dashboard/studio/assets/index.html"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals"
        className={`h-[calc(100dvh-140px)] min-h-[600px] w-full rounded-xl border border-neutral-200 bg-white md:h-[calc(100dvh-64px)] ${view === "studio" ? "block" : "hidden"}`}
      />
      {view === "vault" && <MediaVault items={vault} folders={folders} onBack={() => setView("studio")} onExportDesigns={exportDesigns} canExportDesigns={onDesignHome} onUse={useInStudio} />}
      {saving && (
        <div role="status" className={`fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${saving.error ? "bg-red-600 text-white" : "bg-neutral-900 text-white"}`}>
          <span className="flex-1">{saving.text}</span>
          {saving.done && !saving.error && view !== "vault" && (
            <button type="button" className="rounded-lg bg-white/20 px-2.5 py-1" onClick={() => { setSaving(null); openVault(); }}>Open</button>
          )}
          {saving.done && <button type="button" aria-label="Dismiss" className="text-lg leading-none opacity-80" onClick={() => setSaving(null)}>×</button>}
        </div>
      )}
      {image && <SaveToTapShop image={image} products={products} onClose={() => setImage(null)} />}
    </>
  );
}
