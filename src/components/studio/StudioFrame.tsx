"use client";

import { useEffect, useRef, useState } from "react";
import { SaveToTapShop, type StudioImage } from "./SaveToTapShop";

// The original static editor runs in an iframe so its CSS and global scripts stay out of
// the app. Keep src stable: remounting the iframe drops unsaved in-memory video edits.
// allow-modals is needed for the "custom size" prompt in the design studio.
export function StudioFrame({ products }: { products: { id: string; title: string }[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [image, setImage] = useState<StudioImage | null>(null);

  useEffect(() => {
    // Only trust messages from our own Studio iframe, in the shape version 1 defines.
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (!d || d.type !== "tapshop:export-ready" || d.version !== 1 || d.kind !== "image") return;
      if (!(d.blob instanceof Blob) || d.blob.type !== "image/png" || d.blob.size === 0) return;
      const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 100) : "Studio design";
      const width = Number(d.width), height = Number(d.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      setImage({ blob: d.blob, name, width, height });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      <iframe
        ref={frame}
        title="TapShop Studio"
        src="/dashboard/studio/assets/index.html"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals"
        className="block h-[calc(100dvh-140px)] min-h-[600px] w-full rounded-xl border border-neutral-200 bg-white md:h-[calc(100dvh-64px)]"
      />
      {image && <SaveToTapShop image={image} products={products} onClose={() => setImage(null)} />}
    </>
  );
}
