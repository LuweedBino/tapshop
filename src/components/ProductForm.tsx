"use client";

import { useActionState, useState } from "react";
import type { Product, ProductType } from "@prisma/client";
import { saveProduct } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { parseExtras } from "@/lib/affiliate";
import { AffiliateFields } from "./AffiliateFields";
import { FileUpload } from "./FileUpload";
import { Submit } from "./Submit";

const TYPES: { value: ProductType; label: string; hint: string }[] = [
  { value: "DIGITAL", label: "Digital product", hint: "Sell a PDF, template, preset, or any file" },
  { value: "LEAD_MAGNET", label: "Lead magnet", hint: "Give a freebie in exchange for an email" },
  { value: "LINK", label: "Link", hint: "Send followers to any URL" },
  { value: "AFFILIATE", label: "Affiliate link", hint: "Recommend a product and earn a commission" },
];

export function ProductForm({ product, initialType }: { product?: Product; initialType?: ProductType }) {
  const [type, setType] = useState<ProductType>(product?.type ?? initialType ?? "DIGITAL");
  const [state, action] = useActionState<FormState, FormData>(saveProduct.bind(null, product?.id ?? null), undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="type" value={type} />
      {!product && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)} className={`rounded-2xl border p-4 text-left transition ${type === t.value ? "border-neutral-900 bg-white ring-2 ring-neutral-900/10" : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
              <p className="font-semibold">{t.label}</p>
              <p className="mt-1 text-xs text-neutral-500">{t.hint}</p>
            </button>
          ))}
        </div>
      )}
      <div className="card space-y-5">
        <div>
          <label className="label" htmlFor="title">{type === "LINK" ? "Button text" : "Title"}</label>
          <input className="input" id="title" name="title" defaultValue={product?.title} required maxLength={120} />
        </div>
        {type === "AFFILIATE" && (
          <div>
            <label className="label" htmlFor="url">Affiliate link</label>
            <input className="input" id="url" name="url" defaultValue={product?.url ?? ""} required placeholder="https://" autoCapitalize="none" />
            <p className="mt-1 text-xs text-neutral-500">Where the main button goes. Clicks are counted on your Products page.</p>
          </div>
        )}
        {type === "LINK" ? (
          <div>
            <label className="label" htmlFor="url">URL</label>
            <input className="input" id="url" name="url" defaultValue={product?.url ?? ""} required placeholder="https://" autoCapitalize="none" />
          </div>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="subtitle">Short description</label>
              <input className="input" id="subtitle" name="subtitle" defaultValue={product?.subtitle} maxLength={200} placeholder="Shown on your store card" />
            </div>
            <div>
              <label className="label" htmlFor="description">Full description</label>
              <textarea className="input min-h-32" id="description" name="description" defaultValue={product?.description} placeholder="What's inside, who it's for, what they'll get" />
            </div>
            {type === "DIGITAL" && (
              <div>
                <label className="label" htmlFor="price">Price (USD)</label>
                <input className="input" id="price" name="price" inputMode="decimal" defaultValue={product ? (product.priceCents / 100).toFixed(2) : "9.00"} placeholder="0 for free" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="ctaLabel">Button label</label>
              <input className="input" id="ctaLabel" name="ctaLabel" defaultValue={product?.ctaLabel} maxLength={40} placeholder={type === "LEAD_MAGNET" ? "Get it free" : type === "AFFILIATE" ? "Shop now" : "Buy now"} />
            </div>
            <FileUpload name="coverKey" visibility="public" initialKey={product?.coverKey} accept="image/*" label="Cover image" hint="Square or 4:3 works best" />
            {type === "AFFILIATE" ? (
              <AffiliateFields extras={parseExtras(product?.extras)} />
            ) : (
              <FileUpload
                name="fileKey"
                visibility="private"
                initialKey={product?.fileKey}
                initialName={product?.fileName}
                label={type === "DIGITAL" ? "File buyers receive" : "Freebie file (optional)"}
                hint={type === "DIGITAL" ? "Delivered instantly after payment, up to 500 MB" : "Leave empty to just collect emails"}
              />
            )}
          </>
        )}
        {type !== "LEAD_MAGNET" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="collectEmails" defaultChecked={product?.collectEmails ?? false} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium">Collect emails</span>
              <span className="block text-xs text-neutral-500">
                {type === "LINK"
                  ? "Visitors enter their name and email before going to the link. They show up in Leads."
                  : type === "AFFILIATE"
                    ? "The main button asks for their name and email first, then opens your affiliate link. They show up in Leads."
                    : "Everyone who enters their email to buy is added to Leads, even if they don't finish paying."}
              </span>
            </span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="published" defaultChecked={product?.published ?? true} className="h-4 w-4" />
          Show on my store
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Submit>{product ? "Save" : "Add to store"}</Submit>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
