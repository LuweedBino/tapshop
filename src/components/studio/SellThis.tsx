"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sellVaultItem } from "@/app/actions/vault";
import { FileUpload } from "@/components/FileUpload";
import { uploadFile } from "@/lib/upload";
import { splitFileName } from "@/lib/vault";
import type { SavedItem } from "./MediaVault";

const COVER_SIZE = 1200;

function shrink(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, COVER_SIZE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

function videoFrame(url: string) {
  return new Promise<Blob | null>((resolve) => {
    const video = document.createElement("video");
    const finish = (blob: Blob | null) => {
      clearTimeout(wait);
      video.removeAttribute("src");
      video.load();
      resolve(blob);
    };
    const wait = setTimeout(() => finish(null), 20000);
    const grab = () => shrink(video, video.videoWidth, video.videoHeight).then(finish, () => finish(null));
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(null);
    video.onloadeddata = () => {
      const at = Math.min(0.5, (video.duration || 0) / 2);
      if (!at) return void grab();
      // Files that stream without seeking never finish a seek, so settle for the first frame.
      const fallback = setTimeout(grab, 2000);
      video.onseeked = () => {
        clearTimeout(fallback);
        grab();
      };
      video.currentTime = at;
    };
    video.src = url;
  });
}

/** Vault files are private, so a cover is a separate small picture made from the file. */
async function coverFrom(item: SavedItem) {
  const url = `/api/vault/${item.id}?raw=1`;
  if (item.kind === "video") return videoFrame(url);
  if (item.kind !== "image") return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const bitmap = await createImageBitmap(await res.blob());
  try {
    return await shrink(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export function SellThis({ item, handle, hasPayments, onClose }: { item: SavedItem; handle: string; hasPayments: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(() => splitFileName(item.name).base.slice(0, 120));
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [auto, setAuto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [coverKey, setCoverKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");

  useEffect(() => {
    let live = true;
    coverFrom(item).then((blob) => {
      if (live && blob) setAuto(blob);
    }, () => {});
    return () => {
      live = false;
    };
  }, [item]);

  useEffect(() => {
    if (!auto) return;
    const url = URL.createObjectURL(auto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [auto]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && status !== "saving" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, status]);

  async function publish() {
    setStatus("saving");
    setError("");
    try {
      const cover = coverKey || (auto ? await uploadFile(new File([auto], "cover.jpg", { type: "image/jpeg" }), "public") : "");
      const result = await sellVaultItem(item.id, { title, description, price, coverKey: cover });
      if (result.error || !result.productId) throw new Error(result.error ?? "Couldn't create the product");
      setProductId(result.productId);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the product");
      setStatus("idle");
    }
  }

  const paid = Number(price.replace(/[$,\s]/g, "")) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" onClick={() => status !== "saving" && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="sell-this" onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="sell-this" className="text-lg font-bold tracking-tight">Sell this</h2>
            <p className="truncate text-sm text-neutral-500">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={status === "saving"} className="text-2xl leading-none text-neutral-400 hover:text-neutral-900" aria-label="Close">×</button>
        </div>

        {status === "done" ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">It&apos;s live on your store.</p>
            {paid && !hasPayments && <p className="text-sm text-neutral-600">Connect payments so buyers can pay you.</p>}
            <div className="flex gap-2">
              <Link href={`/${handle}/${productId}`} className="btn flex-1">View it</Link>
              {paid && !hasPayments ? <Link href="/dashboard/payments" className="btn-secondary flex-1">Connect payments</Link> : <button type="button" className="btn-secondary flex-1" onClick={onClose}>Keep creating</button>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {preview && !coverKey && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="max-h-48 w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain" />
            )}
            <FileUpload name="coverKey" visibility="public" accept="image/*" label={preview ? "Use a different cover (optional)" : "Cover picture (optional)"} onChange={setCoverKey} />
            <label className="block">
              <span className="label">Title</span>
              <input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Price (USD)</span>
              <input className="input" inputMode="decimal" placeholder="0 for free" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Description (optional)</span>
              <textarea className="input" rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {paid && !hasPayments && <p className="text-xs text-neutral-500">You&apos;ll need to connect payments before buyers can pay you.</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="button" className="btn w-full" onClick={publish} disabled={status === "saving" || !title.trim()}>
              {status === "saving" ? "Publishing…" : "Publish to my store"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
