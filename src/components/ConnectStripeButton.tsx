"use client";

import { useActionState } from "react";
import { connectStripe } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { Submit } from "./Submit";

export function ConnectStripeButton({ label }: { label: string }) {
  const [state, action] = useActionState<FormState, FormData>(connectStripe, undefined);
  return (
    <form action={action} className="mt-4">
      <Submit pendingText="Opening Stripe…">{label}</Submit>
      {state?.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
