"use client";

import { useActionState, useState } from "react";
import type { Creator, Product } from "@prisma/client";
import { saveProfile } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { parseSocialLinks, type SocialLink } from "@/lib/socials";
import { BUTTON_STYLES, designOf, designVars, FONTS, LAYOUTS, SOCIAL_STYLES, socialStyleOf, THEMES, type Design, type SocialStyle } from "@/lib/design";
import { FONT_CLASS } from "@/lib/fonts";
import { parseAvatarStyle, type AvatarStyle } from "@/lib/avatar";
import { AvatarEditor } from "./AvatarEditor";
import { BannerEditor } from "./BannerEditor";
import { parseBannerStyle, type BannerStyle } from "@/lib/banner";
import { FileUpload } from "./FileUpload";
import { SocialIcon } from "./SocialIcon";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { IconStyleEditor } from "./IconStyleEditor";
import { parseIconStyle, type IconStyle } from "@/lib/iconStyle";
import { ProductCard, StoreFooter, StoreHeader, StoreShell } from "./Storefront";
import { Submit } from "./Submit";

const SWATCHES = ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#2563eb", "#171717"];

export function ProfileForm({ creator, products }: { creator: Creator; products: Product[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, undefined);
  const [design, setDesign] = useState<Design>(designOf(creator));
  const [avatarKey, setAvatarKey] = useState(creator.avatarKey ?? "");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(parseAvatarStyle(creator.avatarStyle));
  const [bannerKey, setBannerKey] = useState(creator.bannerKey ?? "");
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>(parseBannerStyle(creator.bannerStyle));
  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio);
  const [showPreview, setShowPreview] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(parseSocialLinks(creator.socialLinks));
  const [socialStyle, setSocialStyle] = useState<SocialStyle>(socialStyleOf(creator.socialStyle));
  const [iconStyle, setIconStyle] = useState<IconStyle>(parseIconStyle(creator.socialIconStyle));
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  const preview = (
    <Preview
      design={design}
      handle={creator.handle}
      products={products}
      creator={{ avatarKey: avatarKey || null, avatarStyle, bannerKey: bannerKey || null, bannerStyle, displayName: displayName || " ", bio, accentColor: design.accentColor, socialLinks: socialLinks.filter((l) => l.value.trim()), socialStyle, socialIconStyle: iconStyle, theme: design.theme }}
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
          <h2 className="font-semibold">Profile photo</h2>
          <FileUpload name="avatarKey" visibility="public" initialKey={creator.avatarKey} accept="image/*" label="Photo" onChange={setAvatarKey} />
          <AvatarEditor avatarKey={avatarKey} accent={design.accentColor} value={avatarStyle} onChange={setAvatarStyle} />
        </div>

        <div className="card space-y-5">
          <div>
            <h2 className="font-semibold">Banner</h2>
            <p className="mt-0.5 text-sm text-neutral-500">The wide image across the top of your store. Upload your own or pick one from the gallery.</p>
          </div>
          <BannerEditor initialKey={creator.bannerKey} bannerKey={bannerKey} onKeyChange={setBannerKey} accent={design.accentColor} value={bannerStyle} onChange={setBannerStyle} />
        </div>

        <div className="card space-y-5">
          <h2 className="font-semibold">Profile</h2>
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

        <div className="card space-y-5">
          <div>
            <h2 className="font-semibold">Social links</h2>
            <p className="mt-0.5 text-sm text-neutral-500">Add your socials, email, and anywhere else followers can find you.</p>
          </div>
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          <Choice label="Show links as" name="socialStyle" value={socialStyle} options={SOCIAL_STYLES} onChange={setSocialStyle}>
            {(k) => (
              <span className="mb-2 flex h-6 items-center gap-1">
                {k === "text" ? (
                  <span className="rounded-full border border-neutral-300 px-2 text-[10px] font-semibold">Instagram</span>
                ) : k === "icons" ? (
                  (["instagram", "tiktok", "youtube"] as const).map((i) => (
                    <span key={i} className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300"><SocialIcon kind={i} size={12} /></span>
                  ))
                ) : (
                  <span className="flex items-center gap-1 rounded-full border border-neutral-300 px-2 text-[10px] font-semibold"><SocialIcon kind="instagram" size={10} />Instagram</span>
                )}
              </span>
            )}
          </Choice>
          <IconStyleEditor value={iconStyle} onChange={setIconStyle} />
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
      <div className="si-force-motion h-full overflow-y-auto rounded-[1.8rem]">
        <StoreShell design={design} className="min-h-full">
          {/* Keyed so entrance animations replay whenever the icon style changes. */}
          <StoreHeader key={JSON.stringify(creator.socialIconStyle)} creator={creator} />
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
