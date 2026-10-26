"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { uploadFile } from "@/lib/upload";
import { saveStudioImage, type StudioImageTarget } from "@/app/actions/studio";

export type StudioImage = { blob: Blob; name: string; width: number; height: number };
type Target = StudioImageTarget["target"];

const MAX_BYTES = 5 * 1024 * 1024; // matches the public image limit in lib/storage.ts

const TARGETS: { value: Target; label: string; hint: string }[] = [
  { value: "avatar", label: "Profile photo", hint: "Square designs work best" },
  { value: "banner", label: "Store banner", hint: "Wide designs work best" },
  { value: "cover", label: "Product cover", hint: "Shown on the product card and page" },
];

// Public images must stay under 5 MB. Big PNGs are re-encoded (WebP, or JPEG where the
// browser can't make WebP) and scaled down step by step until they fit.
async function fitImage(image: StudioImage) {
  const base = image.name.replace(/[^a-z0-9 -]/gi, "").trim() || "studio-design";
  if (image.blob.size <= MAX_BYTES) return { file: new File([image.blob], `${base}.png`, { type: "image/png" }), shrunk: false };
  const bitmap = await createImageBitmap(image.blob);
  try {
    for (let scale = 1; scale > 0.1; scale *= 0.8) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
      if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
      if (blob && blob.size <= MAX_BYTES) {
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        return { file: new File([blob], `${base}.${ext}`, { type: blob.type }), shrunk: true };
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("This design is too large to save. Try a smaller size.");
}

export function SaveToTapShop({ image, products, onClose }: { image: StudioImage; products: { id: string; title: string }[]; onClose: () => void }) {
  const preview = useMemo(() => URL.createObjectURL(image.blob), [image.blob]);
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  const [target, setTarget] = useState<Target>(image.width > image.height * 1.6 ? "banner" : "avatar");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && status !== "saving" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, status]);

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const { file, shrunk } = await fitImage(image);
      const key = await uploadFile(file, "public");
      const result = await saveStudioImage(target === "cover" ? { target, key, productId } : { target, key });
      if (result?.error) throw new Error(result.error);
      setMessage((result?.ok ?? "Saved") + (shrunk ? " (compressed to fit the 5 MB limit)" : ""));
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the image");
      setStatus("idle");
    }
  }

  const viewHref = target === "cover" && productId ? `/dashboard/products/${productId}` : "/dashboard/store";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" onClick={() => status !== "saving" && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-to-tapshop"
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="save-to-tapshop" className="text-lg font-bold tracking-tight">Save to TapShop</h2>
            <p className="text-sm text-neutral-500">{image.name} · {image.width}×{image.height}</p>
          </div>
          <button type="button" onClick={onClose} disabled={status === "saving"} className="text-2xl leading-none text-neutral-400 hover:text-neutral-900" aria-label="Close">×</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="" className="mb-4 max-h-48 w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain" />

        {status === "done" ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>
            <div className="flex gap-2">
              <Link href={viewHref} className="btn flex-1">View it</Link>
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Keep designing</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="label">Use this image as</legend>
              {TARGETS.map((t) => {
                const disabled = t.value === "cover" && products.length === 0;
                return (
                  <label key={t.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${target === t.value ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
                    <input type="radio" name="target" value={t.value} checked={target === t.value} disabled={disabled} onChange={() => setTarget(t.value)} className="mt-1" />
                    <span>
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className="block text-xs text-neutral-500">{disabled ? "Add a product first" : t.hint}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {target === "cover" && products.length > 0 && (
              <label className="block">
                <span className="label">Product</span>
                <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-xs text-neutral-500">This replaces the current {target === "avatar" ? "profile photo" : target === "banner" ? "banner" : "cover"}.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="button" className="btn w-full" onClick={save} disabled={status === "saving" || (target === "cover" && !productId)}>
              {status === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
