"use client";

import { useActionState, useState } from "react";
import type { MediaKit } from "@prisma/client";
import { saveMediaKit } from "@/app/actions/mediaKit";
import type { FormState } from "@/app/actions/auth";
import { formatCount, LIMITS, parseKit, STAT_PLATFORMS, type KitData } from "@/lib/mediaKit";
import { PLATFORMS } from "@/lib/socials";
import { FileUpload } from "./FileUpload";
import { Submit } from "./Submit";

let nextId = 0;
const withIds = <T,>(items: T[]) => items.map((item) => ({ id: nextId++, item }));

/** A list of rows the creator can add to and remove from. */
function Rows<T>({ title, hint, initial, blank, max, addLabel, render }: {
  title: string;
  hint?: string;
  initial: T[];
  blank: T;
  max: number;
  addLabel: string;
  render: (item: T, i: number) => React.ReactNode;
}) {
  const [rows, setRows] = useState(() => withIds(initial));
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-neutral-500">{hint}</p>}
      </div>
      {rows.map(({ id, item }, i) => (
        <div key={id} className="relative rounded-xl border border-neutral-200 p-3 pr-9">
          {render(item, i)}
          <button type="button" aria-label="Remove" className="absolute right-2.5 top-2.5 text-sm text-neutral-400 hover:text-red-600" onClick={() => setRows((l) => l.filter((r) => r.id !== id))}>✕</button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="btn-secondary" onClick={() => setRows((l) => [...l, ...withIds([blank])])}>{addLabel}</button>
      )}
    </section>
  );
}

const count = (n: number | null) => (n === null ? "" : formatCount(n));

export function MediaKitForm({ kit }: { kit: MediaKit | null }) {
  const [state, action] = useActionState<FormState, FormData>(saveMediaKit, undefined);
  const d: KitData = parseKit(kit?.data);
  return (
    <form action={action} className="space-y-5">
      <section className="card space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="published" defaultChecked={kit?.published ?? false} className="h-4 w-4" />
          Show my media kit (anyone with the link can see it)
        </label>
        <div>
          <label className="label" htmlFor="headline">Headline</label>
          <input className="input" id="headline" name="headline" defaultValue={kit?.headline} maxLength={120} placeholder="e.g. Fitness creator helping busy moms get strong" />
        </div>
        <div>
          <label className="label" htmlFor="about">About me</label>
          <textarea className="input min-h-28" id="about" name="about" defaultValue={kit?.about} maxLength={2000} placeholder="Who you are, what you post, and who your audience is" />
        </div>
      </section>

      <Rows
        title="Stats"
        hint="Your numbers on each platform. Write them like 12,300 or 12.3K. Update them whenever they change."
        initial={d.stats}
        blank={{ kind: "instagram", handle: "", followers: 0, avgViews: null, engagement: null }}
        max={LIMITS.stats}
        addLabel="+ Add platform"
        render={(s, i) => (
          <div className="grid gap-2 sm:grid-cols-5">
            <select name="stat_kind" defaultValue={s.kind} className="input sm:col-span-1" aria-label={`Platform ${i + 1}`}>
              {STAT_PLATFORMS.map((k) => <option key={k} value={k}>{PLATFORMS[k].label}</option>)}
            </select>
            <input name="stat_handle" defaultValue={s.handle} className="input" placeholder="@handle" aria-label="Handle" />
            <input name="stat_followers" defaultValue={s.followers ? count(s.followers) : ""} className="input" placeholder="Followers" required aria-label="Followers" />
            <input name="stat_views" defaultValue={count(s.avgViews)} className="input" placeholder="Avg views" aria-label="Average views" />
            <input name="stat_engagement" defaultValue={s.engagement ?? ""} className="input" placeholder="Engagement %" aria-label="Engagement rate" />
          </div>
        )}
      />

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Audience gender</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Percent of your audience. Find it in your Instagram or TikTok insights. Leave empty to hide.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["women", "men", "other"] as const).map((g) => (
            <div key={g}>
              <label className="label capitalize" htmlFor={`gender_${g}`}>{g} %</label>
              <input className="input" id={`gender_${g}`} name={`gender_${g}`} inputMode="decimal" defaultValue={d.gender ? d.gender[g] : ""} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Rows
          title="Audience age"
          initial={d.ages}
          blank={{ label: "", pct: 0 }}
          max={LIMITS.ages}
          addLabel="+ Add age group"
          render={(a) => (
            <div className="flex gap-2">
              <input name="age_label" defaultValue={a.label} className="input" placeholder="18-24" aria-label="Age group" />
              <input name="age_pct" defaultValue={a.label ? a.pct : ""} className="input w-24" placeholder="%" inputMode="decimal" aria-label="Percent" />
            </div>
          )}
        />
        <Rows
          title="Top locations"
          initial={d.locations}
          blank={{ label: "", pct: 0 }}
          max={LIMITS.locations}
          addLabel="+ Add location"
          render={(l) => (
            <div className="flex gap-2">
              <input name="loc_label" defaultValue={l.label} className="input" placeholder="United States" aria-label="Location" />
              <input name="loc_pct" defaultValue={l.label ? l.pct : ""} className="input w-24" placeholder="%" inputMode="decimal" aria-label="Percent" />
            </div>
          )}
        />
      </div>

      <Rows
        title="Brands I've worked with"
        hint="Show off past partnerships. A logo makes it stand out."
        initial={d.partnerships}
        blank={{ brand: "", logoKey: "", description: "", url: "" }}
        max={LIMITS.partnerships}
        addLabel="+ Add brand"
        render={(p) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="partner_brand" defaultValue={p.brand} className="input" placeholder="Brand name" aria-label="Brand name" />
              <input name="partner_url" defaultValue={p.url} className="input" placeholder="Link to the post (optional)" autoCapitalize="none" aria-label="Link to the post" />
            </div>
            <input name="partner_desc" defaultValue={p.description} className="input" placeholder="What you made, e.g. 3 Reels + 5 Stories, 820K views" aria-label="What you made" />
            <FileUpload name="partner_logo" visibility="public" initialKey={p.logoKey || null} accept="image/*" label="" hint="Logo (optional)" />
          </div>
        )}
      />

      <Rows
        title="Rates"
        hint="What brands can book. Leave the price empty to show &quot;Ask me&quot;."
        initial={d.services}
        blank={{ name: "", price: "", description: "" }}
        max={LIMITS.services}
        addLabel="+ Add rate"
        render={(s) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <input name="service_name" defaultValue={s.name} className="input sm:col-span-2" placeholder="e.g. 1 Instagram Reel" aria-label="Service" />
              <input name="service_price" defaultValue={s.price} className="input" placeholder="$500" aria-label="Price" />
            </div>
            <input name="service_desc" defaultValue={s.description} className="input" placeholder="What's included (optional)" aria-label="What's included" />
          </div>
        )}
      />

      <Rows
        title="Photos"
        hint="Your best shots or examples of past work."
        initial={d.gallery}
        blank=""
        max={LIMITS.gallery}
        addLabel="+ Add photo"
        render={(key) => <FileUpload name="galleryKey" visibility="public" initialKey={key || null} accept="image/*" label="" />}
      />

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border">
        <Submit>Save media kit</Submit>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-sm text-green-700">{state.ok}</span>}
      </div>
    </form>
  );
}
