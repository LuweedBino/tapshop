"use client";

import {
  DEFAULT_ICON_STYLE,
  ICON_COLORS,
  ICON_ENTRANCES,
  ICON_FILLS,
  ICON_HOVERS,
  ICON_MOTIONS,
  ICON_SHAPES,
  ICON_SIZES,
  SPEED_MAX,
  SPEED_MIN,
  type IconStyle,
} from "@/lib/iconStyle";
import { Segmented } from "./Segmented";
import { useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export function IconStyleEditor({ value, onChange }: { value: IconStyle; onChange: (s: IconStyle) => void }) {
  const set = <K extends keyof IconStyle>(k: K, v: IconStyle[K]) => onChange({ ...value, [k]: v });
  const reduced = useReducedMotion();
  return (
    <div className="space-y-5 rounded-2xl bg-neutral-50 p-4">
      <input type="hidden" name="socialIconStyle" value={JSON.stringify(value)} />
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Icon style</h3>
        <button type="button" className="text-xs font-medium text-neutral-500 hover:text-neutral-900" onClick={() => onChange(DEFAULT_ICON_STYLE)}>
          Reset
        </button>
      </div>
      <Segmented label="Shape" options={ICON_SHAPES} value={value.shape} onChange={(v) => set("shape", v)} />
      {value.shape !== "none" && <Segmented label="Fill" options={ICON_FILLS} value={value.fill} onChange={(v) => set("fill", v)} />}
      <div>
        <Segmented label="Color" options={ICON_COLORS} value={value.color} onChange={(v) => set("color", v)} />
        {value.color === "custom" && (
          <input type="color" aria-label="Custom icon color" value={value.customColor} onChange={(e) => set("customColor", e.target.value)} className="mt-2 h-9 w-14 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
        )}
      </div>
      <Segmented label="Icon size" options={ICON_SIZES} value={value.size} onChange={(v) => set("size", v)} />
      <Segmented label="On hover" options={ICON_HOVERS} value={value.hover} onChange={(v) => set("hover", v)} />
      {value.hover !== "none" && <Speed value={value.hoverSpeed} onChange={(v) => set("hoverSpeed", v)} />}
      <Segmented label="When the page opens" options={ICON_ENTRANCES} value={value.entrance} onChange={(v) => set("entrance", v)} />
      {value.entrance !== "none" && <Speed value={value.entranceSpeed} onChange={(v) => set("entranceSpeed", v)} />}
      <Segmented label="Always-on motion" options={ICON_MOTIONS} value={value.motion} onChange={(v) => set("motion", v)} />
      {value.motion !== "none" && <Speed value={value.motionSpeed} onChange={(v) => set("motionSpeed", v)} />}
      {reduced && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          Animations are turned off on this device, so your store won&apos;t move when <em>you</em> open it. The preview still shows them, and
          visitors who have animations on will see them. To turn them on (Windows): Settings → Accessibility → Visual effects → Animation
          effects. On a Mac: System Settings → Accessibility → Display → turn off Reduce motion.
        </p>
      )}
    </div>
  );
}

function Speed({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="-mt-2 flex items-center gap-3 text-xs text-neutral-500">
      <span className="w-10 shrink-0">Slower</span>
      <input type="range" min={SPEED_MIN} max={SPEED_MAX} step={0.25} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 accent-neutral-900" aria-label="Speed" />
      <span className="w-10 shrink-0 text-right">Faster</span>
      <span className="w-10 shrink-0 text-right font-semibold text-neutral-800">{value}×</span>
    </label>
  );
}
