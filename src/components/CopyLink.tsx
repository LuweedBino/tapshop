"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{url.replace(/^https?:\/\//, "")}</span>
      <button
        type="button"
        className="btn py-2"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
