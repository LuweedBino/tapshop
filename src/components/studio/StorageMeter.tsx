import { formatBytes, VAULT_KINDS, VAULT_QUOTA_BYTES, type VaultKind } from "@/lib/vault";

const COLORS: Record<VaultKind, string> = {
  video: "bg-violet-500",
  image: "bg-sky-500",
  audio: "bg-amber-500",
  document: "bg-emerald-500",
  project: "bg-pink-500",
  other: "bg-neutral-400",
};

/** How much of the creator's Vault space is used, split by file type. */
export function StorageMeter({ items }: { items: { kind: string; size: number }[] }) {
  const byKind = items.reduce<Record<string, number>>((m, i) => ((m[i.kind in COLORS ? i.kind : "other"] = (m[i.kind in COLORS ? i.kind : "other"] ?? 0) + i.size), m), {});
  const used = items.reduce((n, i) => n + i.size, 0);
  const share = Math.min(1, used / VAULT_QUOTA_BYTES);
  const percent = used === 0 ? 0 : Math.max(1, Math.round(share * 100));
  const full = share >= 1, nearlyFull = share >= 0.9;
  const kinds = (Object.keys(COLORS) as VaultKind[]).filter((k) => byKind[k]);

  return (
    <section aria-label="Storage" className="mb-5 rounded-xl border border-neutral-200 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <p className="font-semibold">
          {formatBytes(used)} of {formatBytes(VAULT_QUOTA_BYTES)} used
        </p>
        <p className={full || nearlyFull ? "font-semibold text-red-600" : "text-neutral-500"}>
          {full ? "Your Vault is full" : `${formatBytes(VAULT_QUOTA_BYTES - used)} free${nearlyFull ? " · almost full" : ""}`}
        </p>
      </div>
      <div
        role="meter"
        aria-label="Media Vault space used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% used`}
        className="flex h-3 overflow-hidden rounded-full bg-neutral-200"
      >
        {kinds.map((k) => (
          <span key={k} className={COLORS[k]} style={{ width: `${Math.max(0.5, (byKind[k] / VAULT_QUOTA_BYTES) * 100)}%` }} title={`${VAULT_KINDS[k]}: ${formatBytes(byKind[k])}`} />
        ))}
      </div>
      {kinds.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${COLORS[k]}`} aria-hidden />
              {VAULT_KINDS[k]} {formatBytes(byKind[k])}
            </li>
          ))}
        </ul>
      )}
      {(full || nearlyFull) && <p className="mt-2 text-xs text-neutral-500">Delete files you don&apos;t need to make room for new ones.</p>}
    </section>
  );
}
