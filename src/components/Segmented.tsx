"use client";

// A row of pill buttons for picking one option.
export function Segmented<K extends string>({ label, options, value, onChange }: { label: string; options: Record<K, { label: string }>; value: K; onChange: (v: K) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(options) as K[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${value === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-500"}`}
          >
            {options[k].label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
