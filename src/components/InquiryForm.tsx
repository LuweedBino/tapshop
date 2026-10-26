"use client";

import { useActionState } from "react";
import { sendInquiry, type InquiryState } from "@/app/actions/mediaKit";
import { Submit } from "./Submit";

/** In the builder's preview the form shows but can't be sent. */
export function InquiryForm({ creatorId, creatorName, preview = false }: { creatorId: string; creatorName: string; preview?: boolean }) {
  const [state, action] = useActionState<InquiryState, FormData>(sendInquiry.bind(null, creatorId), undefined);
  if (state?.sent) {
    return <p className="rounded-[var(--btn-radius)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-4 py-6 text-center font-semibold">Thanks! {creatorName} will get back to you by email.</p>;
  }
  return (
    <form action={action} className="space-y-3" onSubmit={(e) => preview && e.preventDefault()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" name="name" placeholder="Your name" autoComplete="name" required />
        <input className="input" name="email" type="email" placeholder="Work email" autoComplete="email" required />
        <input className="input" name="company" placeholder="Brand or company" autoComplete="organization" />
        <input className="input" name="budget" placeholder="Budget (optional)" />
      </div>
      <textarea className="input min-h-28" name="message" placeholder="Tell me about your campaign" required maxLength={3000} />
      {/* Hidden from people; bots fill it in. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Submit className="w-full rounded-[var(--btn-radius)] bg-[var(--accent)] py-3.5 text-base font-semibold text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-60" pendingText="Sending…">
        Send inquiry
      </Submit>
    </form>
  );
}
