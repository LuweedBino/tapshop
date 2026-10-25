"use client";

import { useRef } from "react";
import {
  AVATAR_FILTERS,
  AVATAR_FRAMES,
  AVATAR_SHAPES,
  AVATAR_SIZES,
  DEFAULT_AVATAR_STYLE,
  avatarFrameStyle,
  avatarImageStyle,
  type AvatarStyle,
} from "@/lib/avatar";
import { fileUrl } from "@/lib/format";
import { Segmented } from "./Segmented";

const EDITOR_PX = 176;

export function AvatarEditor({ avatarKey, accent, value, onChange }: { avatarKey: string; accent: string; value: AvatarStyle; onChange: (s: AvatarStyle) => void }) {
  const src = fileUrl(avatarKey);
  const drag = useRef<{ x: number; y: number; start: AvatarStyle } | null>(null);
  const set = <K extends keyof AvatarStyle>(k: K, v: AvatarStyle[K]) => onChange({ ...value, [k]: v });

  // Dragging moves the photo with the pointer, so the focus point moves the opposite way.
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const k = 100 / (EDITOR_PX * value.zoom);
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
    onChange({ ...value, x: clamp(d.start.x - (e.clientX - d.x) * k), y: clamp(d.start.y - (e.clientY - d.y) * k) });
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="avatarStyle" value={JSON.stringify(value)} />
      {src && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-neutral-100 py-6">
          <div
            className="cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
            style={{ ...avatarFrameStyle(value, accent, EDITOR_PX), background: accent }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, start: value };
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" style={avatarImageStyle(value)} />
          </div>
          <p className="text-xs text-neutral-500">Drag the photo to center it</p>
        </div>
      )}

      {src && (
        <>
          <Slider label="Zoom" min={1} max={3} step={0.05} value={value.zoom} display={`${value.zoom.toFixed(1)}×`} onChange={(v) => set("zoom", v)} />
          <Slider label="Brightness" min={50} max={150} step={1} value={value.brightness} display={`${value.brightness - 100 > 0 ? "+" : ""}${value.brightness - 100}`} onChange={(v) => set("brightness", v)} />
          <div>
            <span className="label">Effect</span>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {(Object.keys(AVATAR_FILTERS) as AvatarStyle["filter"][]).map((f) => (
                <button key={f} type="button" aria-pressed={value.filter === f} onClick={() => set("filter", f)} className="flex shrink-0 flex-col items-center gap-1">
                  <span className={`block h-14 w-14 overflow-hidden rounded-xl ${value.filter === f ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" style={avatarImageStyle({ ...value, filter: f, brightness: 100 })} />
                  </span>
                  <span className={`text-xs ${value.filter === f ? "font-semibold" : "text-neutral-500"}`}>{AVATAR_FILTERS[f].label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Segmented label="Shape" options={AVATAR_SHAPES} value={value.shape} onChange={(v) => set("shape", v)} />
      <Segmented label="Frame" options={AVATAR_FRAMES} value={value.frame} onChange={(v) => set("frame", v)} />
      <Segmented label="Size" options={AVATAR_SIZES} value={value.size} onChange={(v) => set("size", v)} />

      <button type="button" className="text-sm font-medium text-neutral-500 hover:text-neutral-900" onClick={() => onChange(DEFAULT_AVATAR_STYLE)}>
        Reset photo settings
      </button>
    </div>
  );
}

function Slider({ label, min, max, step, value, display, onChange }: { label: string; min: number; max: number; step: number; value: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label flex justify-between">
        {label}
        <span className="font-normal text-neutral-500">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-neutral-900" />
    </label>
  );
}
