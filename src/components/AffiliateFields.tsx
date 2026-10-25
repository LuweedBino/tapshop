"use client";

import { useState } from "react";
import { MAX_BUTTONS, MAX_GALLERY, type AffiliateExtras } from "@/lib/affiliate";
import { FileUpload } from "./FileUpload";

let nextId = 0;
const withIds = <T,>(items: T[]) => items.map((item) => ({ id: nextId++, item }));

/** The extra parts of an affiliate page: discount code, video, more images and more buttons. */
export function AffiliateFields({ extras }: { extras: AffiliateExtras }) {
  const [images, setImages] = useState(() => withIds(extras.gallery));
  const [buttons, setButtons] = useState(() => withIds(extras.buttons));
  return (
    <>
      <div>
        <label className="label" htmlFor="code">Discount code (optional)</label>
        <input className="input" id="code" name="code" defaultValue={extras.code} maxLength={40} placeholder="e.g. MAYA10" autoCapitalize="characters" />
        <p className="mt-1 text-xs text-neutral-500">Shown with a copy button.</p>
      </div>
      <div>
        <label className="label" htmlFor="video">Video (optional)</label>
        <input className="input" id="video" name="video" defaultValue={extras.video} placeholder="YouTube, Vimeo or Loom link" autoCapitalize="none" />
      </div>

      <div>
        <span className="label">More images</span>
        <div className="space-y-3">
          {images.map(({ id, item }) => (
            <div key={id} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3">
              <div className="flex-1">
                <FileUpload name="galleryKey" visibility="public" initialKey={item} accept="image/*" label="" />
              </div>
              <button type="button" className="text-sm text-neutral-400 hover:text-red-600" aria-label="Remove image" onClick={() => setImages((l) => l.filter((x) => x.id !== id))}>✕</button>
            </div>
          ))}
        </div>
        {images.length < MAX_GALLERY && (
          <button type="button" className="btn-secondary mt-2" onClick={() => setImages((l) => [...l, ...withIds([""])])}>+ Add image</button>
        )}
        <p className="mt-1 text-xs text-neutral-500">Up to {MAX_GALLERY}. Shown under the description.</p>
      </div>

      <div>
        <span className="label">More buttons</span>
        <div className="space-y-2">
          {buttons.map(({ id, item }, i) => (
            <div key={id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center">
              <input className="input sm:w-40" name="buttonLabel" defaultValue={item.label} maxLength={60} placeholder="Label" aria-label={`Button ${i + 2} label`} />
              <input className="input flex-1" name="buttonUrl" defaultValue={item.url} placeholder="https://" autoCapitalize="none" aria-label={`Button ${i + 2} link`} />
              <button type="button" className="self-end text-sm text-neutral-400 hover:text-red-600 sm:self-auto" aria-label="Remove button" onClick={() => setButtons((l) => l.filter((x) => x.id !== id))}>✕</button>
            </div>
          ))}
        </div>
        {buttons.length < MAX_BUTTONS && (
          <button type="button" className="btn-secondary mt-2" onClick={() => setButtons((l) => [...l, ...withIds([{ label: "", url: "" }])])}>+ Add button</button>
        )}
        <p className="mt-1 text-xs text-neutral-500">For other sizes, colors, or a second shop. Shown under the main button.</p>
      </div>
    </>
  );
}
