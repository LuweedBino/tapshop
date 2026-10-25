"use client";

import { useActionState } from "react";
import { connectStripe } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { Submit } from "./Submit";

/** `countries` is shown only before the creator has a Stripe account, since Stripe can't change it later. */
export function ConnectStripeButton({ label, countries, defaultCountry }: { label: string; countries?: [string, string][]; defaultCountry?: string }) {
  const [state, action] = useActionState<FormState, FormData>(connectStripe, undefined);
  return (
    <form action={action} className="mt-4">
      {countries && (
        <div className="mb-4">
          <label htmlFor="country" className="label">Country</label>
          <select id="country" name="country" className="input" defaultValue={defaultCountry ?? ""} required>
            <option value="" disabled>Choose your country</option>
            {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <p className="mt-1 text-xs text-neutral-500">Where you live or run your business. Stripe can&apos;t change this later.</p>
        </div>
      )}
      <Submit pendingText="Opening Stripe…">{label}</Submit>
      {state?.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
