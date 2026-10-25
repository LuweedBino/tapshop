"use client";

export function Slider({ label, min, max, step, value, display, onChange }: { label: string; min: number; max: number; step: number; value: number; display: string; onChange: (v: number) => void }) {
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
