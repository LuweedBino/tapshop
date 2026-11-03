"use client";

import { useEffect, useRef, useState } from "react";
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

type Frames = { count: number; at: (i: number) => Promise<Blob | null>; close: () => void };
// ImageDecoder isn't in every browser or in TypeScript's own list yet, so it's described here.
type GifDecoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  decode: (o: { frameIndex: number }) => Promise<{ image: VideoFrame }>;
  close: () => void;
};

/** Lets the creator pick a GIF's cover frame. Browsers without ImageDecoder keep the first frame. */
async function gifFrames(blob: Blob): Promise<Frames | null> {
  const Decoder = (window as unknown as { ImageDecoder?: new (init: { data: ArrayBuffer; type: string }) => GifDecoder }).ImageDecoder;
  if (!Decoder) return null;
  const decoder = new Decoder({ data: await blob.arrayBuffer(), type: "image/gif" });
  await decoder.tracks.ready;
  const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
  if (count < 2) {
    decoder.close();
    return null;
  }
  return {
    count,
    at: async (i) => {
      const { image } = await decoder.decode({ frameIndex: i });
      try {
        return await shrink(image as unknown as CanvasImageSource, image.displayWidth, image.displayHeight);
      } finally {
        image.close();
      }
    },
    close: () => decoder.close(),
  };
}

/** Vault files are private, so a cover is a separate small picture made from the file. */
async function coverFrom(item: SavedItem): Promise<{ blob: Blob | null; frames?: Frames | null }> {
  const url = `/api/vault/${item.id}?raw=1`;
  if (item.kind === "video") return { blob: await videoFrame(url) };
  if (item.kind !== "image") return { blob: null };
  const res = await fetch(url);
  if (!res.ok) return { blob: null };
  const file = await res.blob();
  if (file.type === "image/gif" || /\.gif$/i.test(item.name)) {
    const frames = await gifFrames(file).catch(() => null);
    // The middle frame: a GIF's first frame is often before anything has animated in.
    if (frames) return { blob: await frames.at(Math.floor(frames.count / 2)), frames };
  }
  const bitmap = await createImageBitmap(file);
  try {
    return { blob: await shrink(bitmap, bitmap.width, bitmap.height) };
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
  const [frames, setFrames] = useState<Frames | null>(null);
  const [frame, setFrame] = useState(0);
  const wanted = useRef(0);
  const decoding = useRef(false);

  useEffect(() => {
    let live = true;
    let opened: Frames | null | undefined;
    coverFrom(item).then(({ blob, frames: found }) => {
      opened = found;
      if (!live) return found?.close();
      if (blob) setAuto(blob);
      if (found) {
        setFrames(found);
        setFrame(Math.floor(found.count / 2));
      }
    }, () => {});
    return () => {
      live = false;
      opened?.close();
    };
  }, [item]);

  // Dragging asks for frames faster than they decode, so only the newest one gets drawn.
  async function pickFrame(i: number) {
    setFrame(i);
    wanted.current = i;
    if (decoding.current || !frames) return;
    decoding.current = true;
    try {
      let shown = -1;
      while (shown !== wanted.current) {
        shown = wanted.current;
        const blob = await frames.at(shown);
        if (blob) setAuto(blob);
      }
    } catch {
      // The picker closed mid-drag; the last frame shown stays as the cover.
    } finally {
      decoding.current = false;
    }
  }

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
            {frames && preview && !coverKey && (
              <label className="block">
                <span className="label">Cover frame: {frame + 1} of {frames.count}</span>
                <input type="range" min={0} max={frames.count - 1} step={1} value={frame} onChange={(e) => pickFrame(Number(e.target.value))} className="w-full" aria-label="Choose the cover frame" />
              </label>
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
