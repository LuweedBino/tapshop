"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveToTapShop, type StudioImage } from "./SaveToTapShop";
import { MediaVault, saveToVault, type VaultFolderView, type VaultItemView } from "./MediaVault";
import { UseInStudio, type DesignOption, type StudioChoice } from "./UseInStudio";
import { VAULT_MAX_BYTES } from "@/lib/vault";

type VaultFile = { file: File; source: "design" | "video" };
type Page = "design" | "video";
const PAGE_PATH: Record<Page, string> = { design: "/index.html", video: "/video.html" };

// Reads the editor's reply to tapshop:list-designs. Thumbnails must be SVG data URLs (shown in <img>, so they can't run code).
function designOptions(x: unknown): DesignOption[] {
  if (!Array.isArray(x)) return [];
  return x.slice(0, 60).flatMap((d) => {
    if (!d || typeof d !== "object" || typeof d.id !== "string" || !d.id) return [];
    const thumb = typeof d.thumb === "string" && d.thumb.startsWith("data:image/svg+xml") ? d.thumb : null;
    return [{ id: d.id, name: typeof d.name === "string" && d.name.trim() ? d.name.slice(0, 100) : "Untitled design", w: Number(d.w) || 0, h: Number(d.h) || 0, thumb }];
  });
}

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
  const [using, setUsing] = useState<VaultItemView | null>(null);
  const [designs, setDesigns] = useState<DesignOption[] | null>(null);
  // A file waiting for the other Studio page to finish loading (it says tapshop:studio-ready).
  const pending = useRef<{ page: Page; message: unknown; at: number } | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Size the Studio to the space left under the dashboard header, which wraps onto more rows
  // on tablets, so the editor never runs past the bottom of the screen.
  useEffect(() => {
    if (view !== "studio") return;
    function fit() {
      const el = frame.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(420, Math.floor(window.innerHeight - top - 12)));
    }
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [view]);

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
      await saveToVault(files, (d) => setSaving({ text: `Saving ${d} of ${files.length} to your Media Vault…` }), null, vault.reduce((n, i) => n + i.size, 0));
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
      if (d.type === "tapshop:designs") return setDesigns(designOptions(d.items));
      if (d.type === "tapshop:studio-ready") {
        const p = pending.current;
        if (p && p.page === d.page && Date.now() - p.at < 30000) frame.current?.contentWindow?.postMessage(p.message, window.location.origin);
        pending.current = null;
        return;
      }
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

  // Sends a message to one Studio page, opening that page first if another one is showing.
  // Leaving the video editor with unsaved work still asks first (its own beforeunload).
  function sendTo(page: Page, message: unknown) {
    const win = frame.current?.contentWindow;
    if (!win) return;
    if (frameOn(PAGE_PATH[page])) return win.postMessage(message, window.location.origin);
    pending.current = { page, message, at: Date.now() };
    win.location.href = `/dashboard/studio/assets${PAGE_PATH[page]}`;
  }

  // "Use in Studio": saved projects open straight away; other files ask where they should go.
  // The editor fetches the file by id, so the server still checks it belongs to this creator.
  function useInStudio(item: VaultItemView) {
    if (item.kind === "project") {
      setView("studio");
      return sendTo(/\.tapshop-design\.json$/i.test(item.name) ? "design" : "video", importMessage(item));
    }
    setUsing(item);
    setDesigns(null);
    frame.current?.contentWindow?.postMessage({ type: "tapshop:list-designs", version: 1 }, window.location.origin);
    setTimeout(() => setDesigns((d) => d ?? []), 2500);
  }

  function importMessage(item: VaultItemView, design?: string) {
    return { type: "tapshop:vault-import", version: 1, item: { id: item.id, name: item.name, kind: item.kind, contentType: item.contentType }, ...(design ? { target: { design } } : {}) };
  }

  function choose(choice: StudioChoice) {
    if (!using) return;
    const item = using;
    setUsing(null);
    setView("studio");
    if (choice.to === "video") sendTo("video", importMessage(item));
    else sendTo("design", importMessage(item, choice.design));
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
        style={height ? { height } : undefined}
        className={`h-[calc(100dvh-140px)] min-h-[420px] w-full rounded-xl border border-neutral-200 bg-white md:h-[calc(100dvh-64px)] ${view === "studio" ? "block" : "hidden"}`}
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
      {using && <UseInStudio item={using} designs={designs} onChoose={choose} onClose={() => setUsing(null)} />}
      {image && <SaveToTapShop image={image} products={products} onClose={() => setImage(null)} />}
    </>
  );
}
