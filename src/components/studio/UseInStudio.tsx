"use client";

import { useEffect } from "react";
import type { VaultItemView } from "./MediaVault";

export type DesignOption = { id: string; name: string; w: number; h: number; thumb: string | null };
export type StudioChoice = { to: "video" } | { to: "design"; design: string };

/** "Use in Studio": pick the video editor, a new design, or one of the saved designs. */
export function UseInStudio({ item, designs, onChoose, onClose }: { item: VaultItemView; designs: DesignOption[] | null; onChoose: (c: StudioChoice) => void; onClose: () => void }) {
  const forVideo = item.kind === "video" || item.kind === "audio";
  const forDesign = item.kind === "video" || item.kind === "image";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="use-in-studio-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="use-in-studio-title" className="text-lg font-bold">Use in Studio</h2>
            <p className="truncate text-sm text-neutral-500" title={item.name}>{item.name}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-neutral-300 text-xl leading-none">×</button>
        </div>

        {forVideo && (
          <button type="button" onClick={() => onChoose({ to: "video" })} className="mb-4 flex w-full items-center gap-3 rounded-xl border-2 border-neutral-900 p-3 text-left hover:bg-neutral-50">
            <span className="text-2xl" aria-hidden>🎬</span>
            <span>
              <span className="block font-semibold">Edit in Video Editor</span>
              <span className="block text-sm text-neutral-500">{item.kind === "audio" ? "Adds it as music on your video timeline" : "Adds it to your video timeline"}</span>
            </span>
          </button>
        )}

        {forDesign && (
          <>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">{forVideo ? "Or put it in a design" : "Put it in a design"}</h3>
            <button type="button" onClick={() => onChoose({ to: "design", design: "new" })} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-neutral-300 p-3 text-left hover:bg-neutral-50">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-2xl" aria-hidden>＋</span>
              <span>
                <span className="block font-semibold">New design</span>
                <span className="block text-sm text-neutral-500">Starts a design the same size as this {item.kind === "video" ? "video" : "picture"}</span>
              </span>
            </button>
            {designs === null ? (
              <p className="py-2 text-sm text-neutral-500">Looking for your designs…</p>
            ) : designs.length > 0 ? (
              <>
                <p className="mb-2 text-sm text-neutral-500">Or add it to one of your designs:</p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {designs.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => onChoose({ to: "design", design: d.id })} className="w-full overflow-hidden rounded-xl border border-neutral-200 text-left hover:border-neutral-900">
                        <span className="theme-light flex aspect-video items-center justify-center bg-neutral-100">
                          {d.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.thumb} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-2xl" aria-hidden>🎨</span>
                          )}
                        </span>
                        <span className="block truncate px-2 pt-1.5 text-sm font-semibold">{d.name}</span>
                        <span className="block px-2 pb-1.5 text-xs text-neutral-500">{d.w && d.h ? `${d.w} × ${d.h}` : "Design"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}

        <button type="button" onClick={onClose} className="btn-secondary mt-4 w-full">Cancel</button>
      </div>
    </div>
  );
}
