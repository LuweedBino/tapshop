"use client";

import { useActionState, useState } from "react";
import type { Creator, Product } from "@prisma/client";
import { saveProfile } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { SOCIALS, type Socials } from "@/lib/format";
import { BUTTON_STYLES, designOf, designVars, FONTS, LAYOUTS, THEMES, type Design } from "@/lib/design";
import { FONT_CLASS } from "@/lib/fonts";
import { FileUpload } from "./FileUpload";
import { ProductCard, StoreFooter, StoreHeader, StoreShell } from "./Storefront";
import { Submit } from "./Submit";

const SWATCHES = ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#2563eb", "#171717"];

export function ProfileForm({ creator, products }: { creator: Creator; products: Product[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, undefined);
  const [design, setDesign] = useState<Design>(designOf(creator));
  const [avatarKey, setAvatarKey] = useState(creator.avatarKey ?? "");
  const [bannerKey, setBannerKey] = useState(creator.bannerKey ?? "");
  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio);
  const [showPreview, setShowPreview] = useState(false);
  const socials = (creator.socialLinks ?? {}) as Socials;
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  const preview = (
    <Preview
      design={design}
      handle={creator.handle}
      products={products}
      creator={{ avatarKey: avatarKey || null, bannerKey: bannerKey || null, displayName: displayName || " ", bio, accentColor: design.accentColor, socialLinks: creator.socialLinks }}
    />
  );

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <form action={action} className="min-w-0 flex-1 space-y-5">
        <button type="button" className="btn-secondary w-full lg:hidden" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
        {showPreview && <div className="flex justify-center lg:hidden">{preview}</div>}

        <div className="card space-y-5">
          <h2 className="font-semibold">Profile</h2>
          <FileUpload name="avatarKey" visibility="public" initialKey={creator.avatarKey} accept="image/*" label="Profile photo" onChange={setAvatarKey} />
          <FileUpload name="bannerKey" visibility="public" initialKey={creator.bannerKey} accept="image/*" label="Banner image" hint="Optional. Shows across the top of your store. A wide image works best." onChange={setBannerKey} />
          <div>
            <label className="label" htmlFor="displayName">Display name</label>
            <input className="input" id="displayName" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="handle">Handle</label>
            <input className="input" id="handle" name="handle" defaultValue={creator.handle} required pattern="[A-Za-z0-9_]{3,30}" autoCapitalize="none" />
          </div>
          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea className="input min-h-24" id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="font-semibold">Design</h2>
          <div>
            <span className="label">Accent color</span>
            <input type="hidden" name="accentColor" value={design.accentColor} />
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => set("accentColor", c)} className={`h-9 w-9 rounded-full ${design.accentColor === c ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`} style={{ background: c }} />
              ))}
              <input type="color" value={design.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
            </div>
          </div>

          <Choice label="Theme" name="theme" value={design.theme} options={THEMES} onChange={(v) => set("theme", v)}>
            {(k) => <span className="mb-2 block h-10 rounded-lg border border-neutral-200" style={{ background: designVars({ ...design, theme: k }, 40).background as string }} />}
          </Choice>
          <Choice label="Font" name="font" value={design.font} options={FONTS} onChange={(v) => set("font", v)}>
            {(k) => <span className={`mb-1 block text-2xl font-bold ${FONT_CLASS[k]}`}>Aa</span>}
          </Choice>
          <Choice label="Button shape" name="buttonStyle" value={design.buttonStyle} options={BUTTON_STYLES} onChange={(v) => set("buttonStyle", v)}>
            {(k) => <span className="mb-2 block h-6 bg-neutral-900" style={{ borderRadius: k === "pill" ? 9999 : k === "square" ? 3 : 8 }} />}
          </Choice>
          <Choice label="Product layout" name="layout" value={design.layout} options={LAYOUTS} onChange={(v) => set("layout", v)} />
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Social links</h2>
          {SOCIALS.map((k) => (
            <div key={k}>
              <label className="label capitalize" htmlFor={`social_${k}`}>{k === "x" ? "X (Twitter)" : k}</label>
              <input className="input" id={`social_${k}`} name={`social_${k}`} defaultValue={socials[k] ?? ""} placeholder={k === "website" ? "yoursite.com" : "@username or full URL"} autoCapitalize="none" />
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <Submit>Save changes</Submit>
          {state?.ok && <span className="text-sm font-medium text-green-700">Saved</span>}
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
      <aside className="sticky top-8 hidden shrink-0 lg:block">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">Live preview</p>
        {preview}
      </aside>
    </div>
  );
}

function Choice<K extends string>({ label, name, value, options, onChange, children }: {
  label: string;
  name: string;
  value: K;
  options: Record<K, { label: string; hint?: string }>;
  onChange: (v: K) => void;
  children?: (k: K) => React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(options) as K[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            className={`rounded-xl border p-3 text-left transition ${value === k ? "border-neutral-900 ring-2 ring-neutral-900/10" : "border-neutral-200 hover:border-neutral-400"}`}
          >
            {children?.(k)}
            <span className="block text-sm font-semibold">{options[k].label}</span>
            {options[k].hint && <span className="block text-xs text-neutral-500">{options[k].hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Preview({ design, handle, products, creator }: {
  design: Design;
  handle: string;
  products: Product[];
  creator: Parameters<typeof StoreHeader>[0]["creator"];
}) {
  return (
    // Clicks are swallowed so links in the preview don't navigate away from unsaved changes.
    <div className="h-[600px] w-[300px] overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl" onClickCapture={(e) => e.preventDefault()}>
      <div className="h-full overflow-y-auto rounded-[1.8rem]">
        <StoreShell design={design} className="min-h-full">
          <StoreHeader creator={creator} />
          <section className="mt-6 space-y-3 px-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} handle={handle} layout={design.layout} />
            ))}
            {products.length === 0 && <p className="py-8 text-center text-sm text-[var(--page-muted)]">Your products will show here.</p>}
          </section>
          <StoreFooter />
        </StoreShell>
      </div>
    </div>
  );
}
