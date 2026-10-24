"use client";

import { useActionState } from "react";
import { buy, optIn, type BuyState } from "@/app/actions/buy";
import { Submit } from "./Submit";

export function BuyForm({ productId, kind, cta, accent, disabledReason }: { productId: string; kind: "buy" | "optin"; cta: string; accent: string; disabledReason?: string }) {
  const [state, action] = useActionState<BuyState, FormData>((kind === "buy" ? buy : optIn).bind(null, productId), undefined);
  return (
    <form action={action} className="space-y-3">
      <input className="input" name="name" placeholder="Your name" autoComplete="name" />
      <input className="input" name="email" type="email" required placeholder="Your email" autoComplete="email" />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {disabledReason ? (
        <p className="rounded-xl bg-neutral-100 py-3.5 text-center text-sm text-neutral-500">{disabledReason}</p>
      ) : (
        <Submit className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60" style={{ background: accent }} pendingText={kind === "buy" ? "Opening checkout…" : "Sending…"}>
          {cta}
        </Submit>
      )}
    </form>
  );
}
