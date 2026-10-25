"use client";

import { useRef } from "react";
import { AVATAR_FILTERS } from "@/lib/avatar";
import {
  BANNER_AVATAR,
  BANNER_EDGES,
  BANNER_HEIGHTS,
  BANNER_LAYOUTS,
  BANNER_MOTIONS,
  BANNER_OVERLAYS,
  BANNER_PATTERNS,
  BANNER_SOURCES,
  DEFAULT_BANNER_STYLE,
  bannerSrc,
  type BannerStyle,
} from "@/lib/banner";
import { BANNER_GROUPS, BANNER_PRESETS, bannerPresetSrc, type BannerPresetId } from "@/lib/bannerGallery";
import { FileUpload } from "./FileUpload";
import { Segmented } from "./Segmented";
import { Slider } from "./Slider";
import { Banner } from "./Storefront";

const PRESET_IDS = Object.keys(BANNER_PRESETS) as BannerPresetId[];

export function BannerEditor({ initialKey, bannerKey, onKeyChange, accent, value, onChange }: {
  initialKey: string | null;
  bannerKey: string;
  onKeyChange: (key: string) => void;
  accent: string;
  value: BannerStyle;
  onChange: (s: BannerStyle) => void;
}) {
  const set = <K extends keyof BannerStyle>(k: K, v: BannerStyle[K]) => onChange({ ...value, [k]: v });
  const src = bannerSrc(value, bannerKey, accent);
  const drag = useRef<{ x: number; y: number; w: number; h: number; start: BannerStyle } | null>(null);

  // Dragging moves the image with the pointer, so the focus point moves the opposite way.
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
    onChange({ ...value, x: clamp(d.start.x - ((e.clientX - d.x) / d.w) * 100 / value.zoom), y: clamp(d.start.y - ((e.clientY - d.y) / d.h) * 100 / value.zoom) });
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="bannerStyle" value={JSON.stringify(value)} />
      <Segmented label="Banner" options={BANNER_SOURCES} value={value.source} onChange={(v) => set("source", v)} />

      {/* Stays mounted so a chosen upload is kept while trying gallery banners. */}
      <div className={value.source === "upload" ? "" : "hidden"}>
        <FileUpload name="bannerKey" visibility="public" initialKey={initialKey} accept="image/*" label="Your banner image" hint="A wide image works best, at least 1500 pixels across." onChange={onKeyChange} />
      </div>

      {value.source === "gallery" && (
        <div className="max-h-96 space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 p-3">
          {BANNER_GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {g}
                {g === "Your color" && <span className="ml-1 font-normal normal-case tracking-normal">· follows your accent color</span>}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESET_IDS.filter((id) => BANNER_PRESETS[id].group === g).map((id) => (
                  <button key={id} type="button" aria-pressed={value.preset === id} onClick={() => set("preset", id)} className="text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bannerPresetSrc(id, accent)} alt="" className={`aspect-[3/1] w-full rounded-lg object-cover ${value.preset === id ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`} />
                    <span className={`mt-1 block text-xs ${value.preset === id ? "font-semibold" : "text-neutral-500"}`}>{BANNER_PRESETS[id].label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {src && (
        <>
          <div className="rounded-2xl bg-neutral-100 py-3">
            <div
              className="si-force-motion cursor-grab touch-none select-none active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                drag.current = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, start: value };
              }}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <Banner src={src} style={{ ...value, layout: "inset" }} accent={accent} />
            </div>
            <p className="mt-2 text-center text-xs text-neutral-500">Drag the image to reposition it</p>
          </div>

          <Slider label="Zoom" min={1} max={3} step={0.05} value={value.zoom} display={`${value.zoom.toFixed(1)}×`} onChange={(v) => set("zoom", v)} />
          <Slider label="Brightness" min={50} max={150} step={1} value={value.brightness} display={`${value.brightness - 100 > 0 ? "+" : ""}${value.brightness - 100}`} onChange={(v) => set("brightness", v)} />
          <Slider label="Blur" min={0} max={12} step={0.5} value={value.blur} display={value.blur ? `${value.blur}` : "Off"} onChange={(v) => set("blur", v)} />

          <div>
            <span className="label">Effect</span>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {(Object.keys(AVATAR_FILTERS) as BannerStyle["filter"][]).map((f) => (
                <button key={f} type="button" aria-pressed={value.filter === f} onClick={() => set("filter", f)} className="flex shrink-0 flex-col items-center gap-1">
                  <span className={`block h-10 w-20 overflow-hidden rounded-lg ${value.filter === f ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${value.x}% ${value.y}%`, filter: AVATAR_FILTERS[f].css || undefined }} />
                  </span>
                  <span className={`text-xs ${value.filter === f ? "font-semibold" : "text-neutral-500"}`}>{AVATAR_FILTERS[f].label}</span>
                </button>
              ))}
            </div>
          </div>

          <Segmented label="Height" options={BANNER_HEIGHTS} value={value.height} onChange={(v) => set("height", v)} />
          <Segmented label="Style" options={BANNER_LAYOUTS} value={value.layout} onChange={(v) => set("layout", v)} />
          <Segmented label="Bottom edge" options={BANNER_EDGES} value={value.edge} onChange={(v) => set("edge", v)} />
          <Segmented label="Color overlay" options={BANNER_OVERLAYS} value={value.overlay} onChange={(v) => set("overlay", v)} />
          {value.overlay !== "none" && <Slider label="Overlay strength" min={5} max={100} step={1} value={value.overlayStrength} display={`${value.overlayStrength}%`} onChange={(v) => set("overlayStrength", v)} />}
          <Segmented label="Texture" options={BANNER_PATTERNS} value={value.pattern} onChange={(v) => set("pattern", v)} />
          <Segmented label="Motion" options={BANNER_MOTIONS} value={value.motion} onChange={(v) => set("motion", v)} />
          {value.motion !== "none" && <Slider label="Motion speed" min={0.25} max={3} step={0.25} value={value.motionSpeed} display={`${value.motionSpeed}×`} onChange={(v) => set("motionSpeed", v)} />}
          <Segmented label="Profile photo" options={BANNER_AVATAR} value={value.avatar} onChange={(v) => set("avatar", v)} />

          <button type="button" className="text-sm font-medium text-neutral-500 hover:text-neutral-900" onClick={() => onChange({ ...DEFAULT_BANNER_STYLE, source: value.source, preset: value.preset })}>
            Reset banner settings
          </button>
        </>
      )}
    </div>
  );
}
