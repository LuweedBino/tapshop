"use client";

import { useActionState, useState } from "react";
import { createDiscount } from "@/app/actions/discounts";
import type { FormState } from "@/app/actions/auth";
import { Segmented } from "./Segmented";
import { Submit } from "./Submit";

const TYPES = { PERCENT: { label: "Percent off" }, FIXED: { label: "Dollars off" } };

/** A date in the creator's own time zone (the server doesn't know it). */
export function LocalDate({ iso }: { iso: string }) {
  return <span suppressHydrationWarning>{new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>;
}

// Remounted with a new key after each code is added, which clears it. Fields are controlled
// because a form action empties plain inputs even when it returns an error.
export function DiscountForm({ products }: { products: { id: string; title: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createDiscount, undefined);
  const [type, setType] = useState<keyof typeof TYPES>("PERCENT");
  const [f, setF] = useState({ code: "", amount: "", productId: "", maxUses: "", ends: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="discount-code">Code</label>
        <input id="discount-code" className="input font-mono uppercase" name="code" required maxLength={30} placeholder="SAVE20" autoComplete="off" value={f.code} onChange={set("code")} />
      </div>
      <Segmented label="Type" options={TYPES} value={type} onChange={setType} />
      <input type="hidden" name="type" value={type} />
      <div>
        <label className="label" htmlFor="discount-amount">{type === "PERCENT" ? "Percent off" : "Dollars off"}</label>
        <input id="discount-amount" className="input" name="amount" type="number" required min={type === "PERCENT" ? 1 : 0.01} max={type === "PERCENT" ? 100 : undefined} step={type === "PERCENT" ? 1 : 0.01} inputMode="decimal" placeholder={type === "PERCENT" ? "20" : "5.00"} value={f.amount} onChange={set("amount")} />
      </div>
      <div>
        <label className="label" htmlFor="discount-product">Works on</label>
        <select id="discount-product" className="input" name="productId" value={f.productId} onChange={set("productId")}>
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="discount-limit">Limit uses (optional)</label>
          <input id="discount-limit" className="input" name="maxUses" type="number" min={1} step={1} inputMode="numeric" placeholder="No limit" value={f.maxUses} onChange={set("maxUses")} />
        </div>
        <div>
          <label className="label" htmlFor="discount-ends">Last day (optional)</label>
          <input id="discount-ends" className="input" type="date" value={f.ends} onChange={set("ends")} />
          {/* Turned into a moment here, so the code ends at midnight where the creator is. */}
          <input type="hidden" name="expiresAt" value={f.ends ? new Date(`${f.ends}T23:59:59`).toISOString() : ""} />
        </div>
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Submit pendingText="Adding…">Add code</Submit>
    </form>
  );
}
