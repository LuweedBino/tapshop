"use client";

import { useActionState, useState } from "react";
import { buy, optIn, previewCode, type BuyState, type CodePreview } from "@/app/actions/buy";
import { Submit } from "./Submit";

type Applied = Exclude<CodePreview, { error: string }>;

// Fields are controlled because a form action empties plain inputs even when it returns an error.
export function BuyForm({ productId, kind, cta, ctaLabel, hasCodes = false, disabledReason }: { productId: string; kind: "buy" | "optin"; cta: string; ctaLabel?: string; hasCodes?: boolean; disabledReason?: string }) {
  const [state, action] = useActionState<BuyState, FormData>((kind === "buy" ? buy : optIn).bind(null, productId), undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [codeError, setCodeError] = useState("");

  async function apply() {
    if (!code.trim() || checking) return;
    setChecking(true);
    setCodeError("");
    try {
      const result = await previewCode(productId, code);
      if ("error" in result) setCodeError(result.error);
      else setApplied(result);
    } catch {
      setCodeError("Couldn't check that code. Please try again.");
    }
    setChecking(false);
  }

  const button = !applied ? cta : applied.totalCents === 0 ? "Get it free" : `${ctaLabel ?? "Buy now"} · ${applied.total}`;
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="name" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" name="email" type="email" required placeholder="Your email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {hasCodes && !disabledReason && (
        applied ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            <span className="min-w-0 break-all"><b className="font-mono">{applied.code}</b>: {applied.off} off</span>
            <input type="hidden" name="code" value={applied.code} />
            <button type="button" className="shrink-0 font-medium underline" onClick={() => { setApplied(null); setCode(""); }}>Remove</button>
          </div>
        ) : !open ? (
          <button type="button" className="text-sm font-medium underline" onClick={() => setOpen(true)}>Have a discount code?</button>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase"
                name="code"
                aria-label="Discount code"
                placeholder="Discount code"
                autoComplete="off"
                autoFocus
                maxLength={30}
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
              />
              <button type="button" onClick={apply} disabled={checking} className="shrink-0 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 disabled:opacity-60">
                {checking ? "Checking…" : "Apply"}
              </button>
            </div>
            {codeError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{codeError}</p>}
          </div>
        )
      )}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {disabledReason ? (
        <p className="rounded-[var(--btn-radius)] bg-neutral-100 py-3.5 text-center text-sm text-neutral-500">{disabledReason}</p>
      ) : (
        <Submit className="w-full rounded-[var(--btn-radius)] bg-[var(--accent)] py-3.5 text-base font-semibold text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-60" pendingText={kind === "buy" ? "Opening checkout…" : "Sending…"}>
          {button}
        </Submit>
      )}
    </form>
  );
}
