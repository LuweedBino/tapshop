"use client";

import { useState } from "react";
import { MAX_SOCIAL_LINKS, PLATFORMS, type SocialKind, type SocialLink } from "@/lib/socials";
import { SocialIcon } from "./SocialIcon";

const KINDS = Object.keys(PLATFORMS) as SocialKind[];
const GROUPS = [...new Set(KINDS.map((k) => PLATFORMS[k].group))];

export function SocialLinksEditor({ value, onChange }: { value: SocialLink[]; onChange: (links: SocialLink[]) => void }) {
  const [picking, setPicking] = useState(value.length === 0);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = KINDS.filter((k) => !q || PLATFORMS[k].label.toLowerCase().includes(q) || k.includes(q));
  const full = value.length >= MAX_SOCIAL_LINKS;

  const update = (i: number, v: string) => onChange(value.map((l, j) => (j === i ? { ...l, value: v } : l)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const add = (kind: SocialKind) => {
    onChange([...value, { kind, value: "" }]);
    setPicking(false);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="socialLinks" value={JSON.stringify(value.filter((l) => l.value.trim()))} />
      {value.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-800" title={PLATFORMS[l.kind].label}>
            <SocialIcon kind={l.kind} />
          </span>
          <input
            className="input min-w-0 flex-1"
            aria-label={PLATFORMS[l.kind].label}
            value={l.value}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`${PLATFORMS[l.kind].label}: ${PLATFORMS[l.kind].placeholder}`}
            type={l.kind === "email" ? "email" : l.kind === "phone" || l.kind === "whatsapp" ? "tel" : "text"}
            autoCapitalize="none"
            autoFocus={i === value.length - 1 && !l.value}
          />
          <div className="flex shrink-0 items-center text-neutral-400">
            <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</IconButton>
            <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>↓</IconButton>
            <IconButton label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</IconButton>
          </div>
        </div>
      ))}

      {picking ? (
        <div className="space-y-3 rounded-2xl border border-neutral-200 p-3">
          <div className="flex gap-2">
            <input className="input" placeholder="Search platforms…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={value.length > 0} />
            {value.length > 0 && (
              <button type="button" className="btn-secondary shrink-0" onClick={() => setPicking(false)}>
                Close
              </button>
            )}
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {GROUPS.map((g) => {
              const kinds = matches.filter((k) => PLATFORMS[k].group === g);
              if (kinds.length === 0) return null;
              return (
                <div key={g}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{g}</p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {kinds.map((k) => (
                      <button key={k} type="button" onClick={() => add(k)} className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center text-xs font-medium text-neutral-700 hover:bg-neutral-100">
                        <SocialIcon kind={k} size={22} />
                        {PLATFORMS[k].label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {matches.length === 0 && <p className="py-4 text-center text-sm text-neutral-500">No match. Try &ldquo;Website&rdquo; and paste any link.</p>}
          </div>
        </div>
      ) : (
        <button type="button" className="btn-secondary w-full" disabled={full} onClick={() => setPicking(true)}>
          {full ? `Up to ${MAX_SOCIAL_LINKS} links` : "+ Add a link"}
        </button>
      )}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex h-9 w-8 items-center justify-center rounded-lg text-sm hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
