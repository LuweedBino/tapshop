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
  type IconStyle,
} from "@/lib/iconStyle";
import { Segmented } from "./Segmented";

export function IconStyleEditor({ value, onChange }: { value: IconStyle; onChange: (s: IconStyle) => void }) {
  const set = <K extends keyof IconStyle>(k: K, v: IconStyle[K]) => onChange({ ...value, [k]: v });
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
      <Segmented label="When the page opens" options={ICON_ENTRANCES} value={value.entrance} onChange={(v) => set("entrance", v)} />
      <Segmented label="Always-on motion" options={ICON_MOTIONS} value={value.motion} onChange={(v) => set("motion", v)} />
    </div>
  );
}
