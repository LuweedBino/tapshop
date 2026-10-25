"use client";

import { useState } from "react";

/** A discount code with a copy button, styled by the store's design. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-[var(--btn-radius)] border-2 border-dashed border-[var(--accent)] p-1.5 pl-4">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-[var(--card-muted)]">Use code</span>
        <span className="block truncate font-mono text-lg font-bold tracking-wider">{code}</span>
      </span>
      <button
        type="button"
        className="rounded-[var(--btn-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
