"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Days, hours, minutes and seconds until `to` (a date-time typed by the creator, in the visitor's time zone). */
export function Countdown({ to, label }: { to: string; label: string }) {
  const end = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!Number.isFinite(end)) return null;
  const left = Math.max(0, end - (now ?? end));
  const parts: [number, string][] = [
    [Math.floor(left / 86400000), "days"],
    [Math.floor(left / 3600000) % 24, "hours"],
    [Math.floor(left / 60000) % 60, "min"],
    [Math.floor(left / 1000) % 60, "sec"],
  ];
  return (
    <div className="text-center">
      {label && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--page-muted)]">{label}</p>}
      <div className="flex justify-center gap-2">
        {parts.map(([v, unit]) => (
          <div key={unit} className="min-w-16 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-[var(--card-text)]">
            <p className="text-2xl font-black tabular-nums">{now === null ? "--" : pad(v)}</p>
            <p className="text-[11px] text-[var(--card-muted)]">{unit}</p>
          </div>
        ))}
      </div>
      {now !== null && left === 0 && <p className="mt-2 text-sm text-[var(--page-muted)]">It&apos;s here!</p>}
    </div>
  );
}
