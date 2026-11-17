"use client";

import { useActionState, useEffect, useRef } from "react";
import { messageAffiliates, saveAffiliateProgram } from "@/app/actions/affiliates";
import type { FormState } from "@/app/actions/auth";
import { Submit } from "./Submit";

export function AffiliateProgramForm({ on, percent, days, note }: { on: boolean; percent: number; days: number; note: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveAffiliateProgram, undefined);
  return (
    <form action={action} className="card space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="affiliateOn" defaultChecked={on} className="mt-1 h-4 w-4" />
        <span>
          <span className="block font-semibold">Let people promote my products</span>
          <span className="block text-sm text-neutral-500">Anyone with a TapShop account can join from your sign-up page and start sharing right away.</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="affiliatePercent">Commission (%)</label>
          <input className="input" id="affiliatePercent" name="affiliatePercent" inputMode="numeric" defaultValue={percent} required />
          <p className="mt-1 text-xs text-neutral-500">Their cut of each sale. You can change it for single products on the Products page.</p>
        </div>
        <div>
          <label className="label" htmlFor="affiliateDays">A click counts for (days)</label>
          <input className="input" id="affiliateDays" name="affiliateDays" inputMode="numeric" defaultValue={days} required />
          <p className="mt-1 text-xs text-neutral-500">If someone buys within this many days of tapping a link, the affiliate gets the sale.</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="affiliateNote">Note for new affiliates (optional)</label>
        <textarea className="input min-h-24" id="affiliateNote" name="affiliateNote" defaultValue={note} maxLength={1000} placeholder="Tips, hashtags to use, what to say about your products…" />
      </div>
      <div className="flex items-center gap-3">
        <Submit>Save program</Submit>
        {state?.ok && <span className="text-sm font-medium text-green-700">{state.ok}</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function MessageAffiliatesForm({ count }: { count: number }) {
  const [state, action] = useActionState<FormState, FormData>(messageAffiliates, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Message your affiliates</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Emailed to {count === 1 ? "your 1 affiliate" : `all ${count} affiliates`} and shown on their Promote page. Great for new products, sales and tips.
        </p>
      </div>
      <input className="input" name="subject" placeholder="Subject" maxLength={120} required />
      <textarea className="input min-h-28" name="body" placeholder="Your message" maxLength={5000} required />
      <div className="flex items-center gap-3">
        <Submit pendingText="Sending…">Send</Submit>
        {state?.ok && <span className="text-sm font-medium text-green-700">{state.ok}</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
