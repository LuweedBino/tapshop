"use client";

import { useActionState, useState } from "react";
import { saveMediaKit } from "@/app/actions/mediaKit";
import type { FormState } from "@/app/actions/auth";
import { FONTS, THEMES } from "@/lib/design";
import { BACKDROPS, BLOCKS, LAYOUTS, BOX_STYLES, CORNERS, formatCount, HEADERS, LIMITS, LOOKS, MOTIONS, newBlock, newId, parseCount, SPACINGS, STAT_PLATFORMS, TITLE_STYLES, type Block, type BlockOf, type BlockType, type BoxStyle, type KitDoc, type KitStyle, type TitleStyle } from "@/lib/mediaKit";
import { PLATFORMS, type SocialKind } from "@/lib/socials";
import { FileUpload } from "./FileUpload";
import { kitDesign, kitLook, MediaKitView, type KitCreator } from "./MediaKitView";
import { StoreShell } from "./Storefront";
import { Segmented } from "./Segmented";
import { Submit } from "./Submit";

const SWATCHES = ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#2563eb", "#171717"];
const ICONS: Record<BlockType, string> = {
  stats: "📊", highlights: "⭐", text: "📝", audience: "👥", brands: "🤝", testimonials: "💬",
  rates: "💲", gallery: "🖼️", video: "🎬", links: "🔗", contact: "✉️",
};

/** A number box that lets people type "12.3K" and keeps what they typed while they type it. */
function CountInput({ value, onChange, ...rest }: { value: number | null; onChange: (n: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value === null || value === 0 ? "" : formatCount(value));
  return <input {...rest} className="input" value={text} onChange={(e) => { setText(e.target.value); onChange(parseCount(e.target.value)); }} />;
}

function PctInput({ value, onChange, ...rest }: { value: number | null; onChange: (n: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <input
      {...rest}
      className={`input ${rest.className ?? ""}`}
      inputMode="decimal"
      placeholder="%"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace("%", "").trim());
        onChange(e.target.value.trim() && Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : null);
      }}
    />
  );
}

/** Rows inside a section (platforms, brands, rates...) that can be added, moved and removed. */
function Items<T extends { id: string }>({ items, onChange, blank, max, add, children }: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => Omit<T, "id">;
  max: number;
  add: string;
  children: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="relative rounded-xl border border-neutral-200 bg-white p-3 pr-9">
          {children(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))))}
          <div className="absolute right-1.5 top-1.5 flex flex-col items-center text-neutral-400">
            <button type="button" aria-label="Remove" className="px-1.5 py-0.5 text-sm hover:text-red-600" onClick={() => onChange(items.filter((x) => x.id !== item.id))}>✕</button>
            {i > 0 && <button type="button" aria-label="Move up" className="px-1.5 text-xs hover:text-neutral-900" onClick={() => move(i, -1)}>▲</button>}
            {i < items.length - 1 && <button type="button" aria-label="Move down" className="px-1.5 text-xs hover:text-neutral-900" onClick={() => move(i, 1)}>▼</button>}
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="btn-secondary text-sm" onClick={() => onChange([...items, { id: newId(), ...blank() } as T])}>{add}</button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** The inputs for one section, by type. */
function BlockFields({ b, set }: { b: Block; set: (patch: Partial<Block>) => void }) {
  switch (b.type) {
    case "stats":
      return (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">Write numbers like 12,300 or 12.3K. Update them whenever they change.</p>
          <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ kind: "instagram" as SocialKind, handle: "", followers: 0, avgViews: null, engagement: null })} max={10} add="+ Add platform">
            {(s, put) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={s.kind} onChange={(e) => put({ kind: e.target.value as SocialKind })} className="input" aria-label="Platform">
                  {STAT_PLATFORMS.map((k) => <option key={k} value={k}>{PLATFORMS[k].label}</option>)}
                </select>
                <input className="input" value={s.handle} onChange={(e) => put({ handle: e.target.value })} placeholder="@handle" aria-label="Handle" />
                <CountInput value={s.followers} onChange={(n) => put({ followers: n ?? 0 })} placeholder="Followers" aria-label="Followers" />
                <div className="flex gap-2">
                  <CountInput value={s.avgViews} onChange={(n) => put({ avgViews: n })} placeholder="Avg views" aria-label="Average views" />
                  <PctInput value={s.engagement} onChange={(n) => put({ engagement: n })} className="w-24" aria-label="Engagement rate" />
                </div>
              </div>
            )}
          </Items>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={b.showTotal} onChange={(e) => set({ showTotal: e.target.checked })} className="h-4 w-4" />
            Show total followers on top
          </label>
        </div>
      );
    case "highlights":
      return (
        <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ value: "", label: "" })} max={6} add="+ Add highlight">
          {(h, put) => (
            <div className="flex gap-2">
              <input className="input w-28" value={h.value} onChange={(e) => put({ value: e.target.value })} placeholder="2M+" aria-label="Number" maxLength={20} />
              <input className="input" value={h.label} onChange={(e) => put({ label: e.target.value })} placeholder="monthly views" aria-label="Label" maxLength={60} />
            </div>
          )}
        </Items>
      );
    case "text":
      return <textarea className="input min-h-32" value={b.body} onChange={(e) => set({ body: e.target.value })} maxLength={3000} placeholder="Who you are, what you post, and who your audience is" aria-label="Text" />;
    case "audience": {
      const g = b.gender ?? { women: 0, men: 0, other: 0 };
      return (
        <div className="space-y-4">
          <div>
            <p className="label">Gender %</p>
            <div className="grid grid-cols-3 gap-2">
              {(["women", "men", "other"] as const).map((k) => (
                <label key={k} className="text-xs capitalize text-neutral-500">
                  {k}
                  <PctInput value={b.gender ? b.gender[k] : null} onChange={(n) => {
                    const next = { ...g, [k]: n ?? 0 };
                    set({ gender: next.women || next.men || next.other ? next : null });
                  }} aria-label={`${k} percent`} />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Age groups</p>
            <Items items={b.ages} onChange={(ages) => set({ ages })} blank={() => ({ label: "", pct: 0 })} max={8} add="+ Add age group">
              {(a, put) => (
                <div className="flex gap-2">
                  <input className="input" value={a.label} onChange={(e) => put({ label: e.target.value })} placeholder="18-24" aria-label="Age group" />
                  <PctInput value={a.label ? a.pct : null} onChange={(n) => put({ pct: n ?? 0 })} className="w-24" aria-label="Percent" />
                </div>
              )}
            </Items>
          </div>
          <div>
            <p className="label">Top locations</p>
            <Items items={b.locations} onChange={(locations) => set({ locations })} blank={() => ({ label: "", pct: 0 })} max={8} add="+ Add location">
              {(l, put) => (
                <div className="flex gap-2">
                  <input className="input" value={l.label} onChange={(e) => put({ label: e.target.value })} placeholder="United States" aria-label="Location" />
                  <PctInput value={l.label ? l.pct : null} onChange={(n) => put({ pct: n ?? 0 })} className="w-24" aria-label="Percent" />
                </div>
              )}
            </Items>
          </div>
        </div>
      );
    }
    case "brands":
      return (
        <div className="space-y-3">
          <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ brand: "", logoKey: "", description: "", url: "" })} max={24} add="+ Add brand">
            {(p, put) => (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input" value={p.brand} onChange={(e) => put({ brand: e.target.value })} placeholder="Brand name" aria-label="Brand name" />
                  <input className="input" value={p.url} onChange={(e) => put({ url: e.target.value })} placeholder="Link to the post (optional)" autoCapitalize="none" aria-label="Link to the post" />
                </div>
                <input className="input" value={p.description} onChange={(e) => put({ description: e.target.value })} placeholder="What you made, e.g. 3 Reels + 5 Stories, 820K views" aria-label="What you made" />
                <FileUpload name="" visibility="public" initialKey={p.logoKey || null} accept="image/*" label="" hint="Logo (optional)" onChange={(logoKey) => put({ logoKey })} />
              </div>
            )}
          </Items>
        </div>
      );
    case "testimonials":
      return (
        <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ quote: "", name: "", role: "" })} max={8} add="+ Add testimonial">
          {(t, put) => (
            <div className="space-y-2">
              <textarea className="input min-h-20" value={t.quote} onChange={(e) => put({ quote: e.target.value })} placeholder="What they said about working with you" aria-label="Quote" maxLength={600} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" value={t.name} onChange={(e) => put({ name: e.target.value })} placeholder="Name" aria-label="Name" />
                <input className="input" value={t.role} onChange={(e) => put({ role: e.target.value })} placeholder="Role, e.g. Marketing at Gymshark" aria-label="Role" />
              </div>
            </div>
          )}
        </Items>
      );
    case "rates":
      return (
        <div className="space-y-3">
          <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ name: "", price: "", description: "" })} max={LIMITS.items} add="+ Add rate">
            {(r, put) => (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="input sm:col-span-2" value={r.name} onChange={(e) => put({ name: e.target.value })} placeholder="e.g. 1 Instagram Reel" aria-label="Service" />
                  <input className="input" value={r.price} onChange={(e) => put({ price: e.target.value })} placeholder="$500" aria-label="Price" />
                </div>
                <input className="input" value={r.description} onChange={(e) => put({ description: e.target.value })} placeholder="What's included (optional)" aria-label="What's included" />
              </div>
            )}
          </Items>
          <Field label="Note under the rates (optional)">
            <input className="input" value={b.note} onChange={(e) => set({ note: e.target.value })} placeholder="Bundles and usage rights available on request" maxLength={300} />
          </Field>
          <p className="text-xs text-neutral-500">Leave a price empty to show &quot;Ask me&quot;.</p>
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-3">
          {(b.layout === "grid" || b.layout === "masonry") && (
            <Segmented label="Photos per row" options={{ 2: { label: "2" }, 3: { label: "3" } }} value={String(b.columns) as "2" | "3"} onChange={(c) => set({ columns: c === "2" ? 2 : 3 })} />
          )}
          <Items
            items={b.images.map((key, i) => ({ id: `${i}:${key}`, key }))}
            onChange={(rows) => set({ images: rows.map((r) => r.key) })}
            blank={() => ({ key: "" })}
            max={LIMITS.gallery}
            add="+ Add photo"
          >
            {(r, put) => <FileUpload name="" visibility="public" initialKey={r.key || null} accept="image/*" label="" onChange={(key) => put({ key })} />}
          </Items>
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <Field label="Video link">
            <input className="input" value={b.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." autoCapitalize="none" />
          </Field>
          <Field label="Caption (optional)">
            <input className="input" value={b.caption} onChange={(e) => set({ caption: e.target.value })} maxLength={200} />
          </Field>
        </div>
      );
    case "links":
      return (
        <Items items={b.items} onChange={(items) => set({ items })} blank={() => ({ label: "", url: "" })} max={8} add="+ Add link">
          {(l, put) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" value={l.label} onChange={(e) => put({ label: e.target.value })} placeholder="Button text, e.g. My best Reel" aria-label="Button text" />
              <input className="input" value={l.url} onChange={(e) => put({ url: e.target.value })} placeholder="https://..." autoCapitalize="none" aria-label="Link" />
            </div>
          )}
        </Items>
      );
    case "contact":
      return (
        <div className="space-y-2">
          <Field label="Intro (optional)">
            <textarea className="input min-h-20" value={b.intro} onChange={(e) => set({ intro: e.target.value })} maxLength={300} placeholder="Tell me about your brand and campaign. I reply within 2 days." />
          </Field>
          <p className="text-xs text-neutral-500">Brands fill in a form here. Their message shows on this page and is emailed to you.</p>
        </div>
      );
  }
}

/** One section in the list: a header to move, hide, rename or delete it, and its fields when open. */
function BlockCard({ b, open, first, last, onToggle, onChange, onMove, onDelete }: {
  b: Block;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Block>) => void;
  onMove: (d: number) => void;
  onDelete: () => void;
}) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30";
  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${b.hidden ? "border-dashed border-neutral-300" : "border-neutral-200"}`} data-block={b.type}>
      <div className="flex items-center gap-1 p-2 pl-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-expanded={open}>
          <span className="text-lg" aria-hidden>{ICONS[b.type]}</span>
          <span className="min-w-0">
            <span className={`block truncate font-semibold ${b.hidden ? "text-neutral-400 line-through" : ""}`}>{b.title || BLOCKS[b.type].label}</span>
            <span className="block truncate text-xs text-neutral-500">{b.hidden ? "Hidden" : b.title === BLOCKS[b.type].label ? BLOCKS[b.type].hint : BLOCKS[b.type].label}</span>
          </span>
        </button>
        <button type="button" className={btn} aria-label="Move up" disabled={first} onClick={() => onMove(-1)}>↑</button>
        <button type="button" className={btn} aria-label="Move down" disabled={last} onClick={() => onMove(1)}>↓</button>
        <button type="button" className={btn} aria-label={b.hidden ? "Show section" : "Hide section"} title={b.hidden ? "Show" : "Hide"} onClick={() => onChange({ hidden: !b.hidden })}>
          {b.hidden ? "🙈" : "👁"}
        </button>
        <button type="button" className={btn} aria-label={open ? "Close" : "Edit"} onClick={onToggle}>{open ? "▾" : "▸"}</button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-neutral-100 p-4">
          <Field label="Section title">
            <input className="input" value={b.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={80} placeholder="Leave empty for no title" />
          </Field>
          <Segmented label="Layout" options={LAYOUTS[b.type] as Record<string, { label: string }>} value={b.layout} onChange={(layout) => onChange({ layout } as Partial<Block>)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Box style">
              <select className="input" value={b.box ?? ""} onChange={(e) => onChange({ box: (e.target.value || null) as BoxStyle | null })}>
                <option value="">Same as page</option>
                {(Object.keys(BOX_STYLES) as BoxStyle[]).map((k) => <option key={k} value={k}>{BOX_STYLES[k].label}</option>)}
              </select>
            </Field>
            <Field label="Title style">
              <select className="input" value={b.heading ?? ""} onChange={(e) => onChange({ heading: (e.target.value || null) as TitleStyle | null })}>
                <option value="">Same as page</option>
                {(Object.keys(TITLE_STYLES) as TitleStyle[]).map((k) => <option key={k} value={k}>{TITLE_STYLES[k].label}</option>)}
              </select>
            </Field>
            <Field label="Text">
              <select className="input" value={b.align ?? ""} onChange={(e) => onChange({ align: (e.target.value || null) as Block["align"] })}>
                <option value="">Left (default)</option>
                <option value="center">Centered</option>
              </select>
            </Field>
            <div>
              <span className="label">Section color</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => onChange({ accent: null })} aria-pressed={b.accent === null} className={`h-8 rounded-full border px-2.5 text-xs font-medium ${b.accent === null ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}>Page</button>
                {SWATCHES.slice(0, 4).map((c) => (
                  <button key={c} type="button" aria-label={`Section color ${c}`} onClick={() => onChange({ accent: c })} className={`h-7 w-7 rounded-full ${b.accent === c ? "ring-2 ring-neutral-900 ring-offset-1" : ""}`} style={{ background: c }} />
                ))}
                <input type="color" aria-label="Custom section color" value={b.accent ?? "#7c3aed"} onChange={(e) => onChange({ accent: e.target.value })} className="h-8 w-9 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
              </div>
            </div>
          </div>
          <BlockFields b={b} set={onChange} />
          <div className="flex justify-end">
            <button type="button" className="text-sm text-neutral-500 hover:text-red-600" onClick={onDelete}>Delete section</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSection({ onAdd, disabled }: { onAdd: (t: BlockType) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (disabled) return <p className="text-center text-sm text-neutral-500">You can have up to {LIMITS.blocks} sections.</p>;
  return open ? (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Add a section</h3>
        <button type="button" className="text-sm text-neutral-500" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(BLOCKS) as BlockType[]).map((t) => (
          <button key={t} type="button" onClick={() => { onAdd(t); setOpen(false); }} className="flex items-start gap-2.5 rounded-xl border border-neutral-200 p-3 text-left transition hover:border-neutral-900">
            <span className="text-lg" aria-hidden>{ICONS[t]}</span>
            <span>
              <span className="block text-sm font-semibold">{BLOCKS[t].label}</span>
              <span className="block text-xs text-neutral-500">{BLOCKS[t].hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  ) : (
    <button type="button" className="w-full rounded-2xl border-2 border-dashed border-neutral-300 py-4 font-semibold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900" onClick={() => setOpen(true)}>
      + Add section
    </button>
  );
}

/** A tiny live sample of a style, used as a button to pick it. */
function Sample({ creator, style, label, active, onClick }: { creator: KitCreator; style: KitStyle; label: string; active: boolean; onClick: () => void }) {
  const look = kitLook(style);
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} className={`overflow-hidden rounded-xl border-2 bg-white text-left transition ${active ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400"}`}>
      <StoreShell design={kitDesign(creator, style)} fadeAt={60} className="relative isolate h-24 overflow-hidden">
        {look.backdrop && <div className={look.backdrop} aria-hidden />}
        <div className={`mk mk-${style.spacing} w-[200%] origin-top-left scale-50 p-4`} style={look.vars}>
          <div className={look.box()}>
            <p className={look.title()}>Reach</p>
            <p className="text-3xl font-black">1.3M</p>
          </div>
          <div className={look.box()}>
            <p className={look.title()}>Rates</p>
            <div className="h-3 w-2/3 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </StoreShell>
      <p className="truncate px-2 py-1.5 text-xs font-semibold">{label}</p>
    </button>
  );
}

function StylePanel({ doc, setStyle, setTags, headline, setHeadline, creator }: {
  doc: KitDoc;
  setStyle: (patch: Partial<KitStyle>) => void;
  setTags: (tags: string[]) => void;
  headline: string;
  setHeadline: (h: string) => void;
  creator: KitCreator;
}) {
  const { style } = doc;
  const [tag, setTag] = useState("");
  const addTag = () => {
    const t = tag.trim().slice(0, 30);
    if (t && !doc.tags.includes(t) && doc.tags.length < LIMITS.tags) setTags([...doc.tags, t]);
    setTag("");
  };
  const storeOr = <T extends string>(options: Record<T, { label: string }>) => ({ store: { label: "Same as store" }, ...options }) as Record<T | "store", { label: string }>;
  const isLook = (l: Partial<KitStyle>) => (Object.keys(l) as (keyof KitStyle)[]).every((k) => l[k] === style[k]);
  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Quick looks</h2>
          <p className="mt-0.5 text-sm text-neutral-500">Tap one to try it on. You can fine-tune everything below, and your color stays the same.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {Object.entries(LOOKS).map(([k, l]) => (
            <Sample key={k} creator={creator} style={{ ...style, ...l.style }} label={l.label} active={isLook(l.style)} onClick={() => setStyle(l.style)} />
          ))}
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="font-semibold">Sections</h2>
        <div>
          <span className="label">Box style</span>
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
            {(Object.keys(BOX_STYLES) as BoxStyle[]).map((k) => (
              <Sample key={k} creator={creator} style={{ ...style, sections: k }} label={BOX_STYLES[k].label} active={style.sections === k} onClick={() => setStyle({ sections: k })} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Want one section to stand out? Open it in the Sections tab and give it its own style.</p>
        </div>
        <Segmented label="Titles" options={TITLE_STYLES} value={style.titles} onChange={(titles) => setStyle({ titles })} />
        <Segmented label="Corners" options={storeOr(CORNERS)} value={style.corners ?? "store"} onChange={(v) => setStyle({ corners: v === "store" ? null : v })} />
        <Segmented label="Spacing" options={SPACINGS} value={style.spacing} onChange={(spacing) => setStyle({ spacing })} />
        <Segmented label="Animation as you scroll" options={MOTIONS} value={style.motion} onChange={(motion) => setStyle({ motion })} />
      </section>

      <section className="card space-y-5">
        <h2 className="font-semibold">Color and background</h2>
        <div>
          <span className="label">Color</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setStyle({ accent: null })} aria-pressed={style.accent === null} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${style.accent === null ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}>
              Same as store
            </button>
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => setStyle({ accent: c })} className={`h-9 w-9 rounded-full ${style.accent === c ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`} style={{ background: c }} />
            ))}
            <input type="color" aria-label="Custom color" value={style.accent ?? creator.accentColor} onChange={(e) => setStyle({ accent: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
          </div>
        </div>
        <Segmented label="Theme" options={storeOr(THEMES)} value={style.theme ?? "store"} onChange={(v) => setStyle({ theme: v === "store" ? null : v })} />
        <Segmented label="Background effect" options={BACKDROPS} value={style.backdrop} onChange={(backdrop) => setStyle({ backdrop })} />
        <Segmented label="Font" options={storeOr(FONTS)} value={style.font ?? "store"} onChange={(v) => setStyle({ font: v === "store" ? null : v })} />
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Top of the page</h2>
        <FileUpload name="" visibility="public" initialKey={style.coverKey || null} accept="image/*" label="Cover photo" hint="A wide photo across the top (optional)" onChange={(coverKey) => setStyle({ coverKey })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={style.showAvatar} onChange={(e) => setStyle({ showAvatar: e.target.checked })} className="h-4 w-4" />
          Show my profile photo
        </label>
        <Segmented label="Header style" options={HEADERS} value={style.header} onChange={(header) => setStyle({ header })} />
        <Segmented label="Header alignment" options={{ center: { label: "Center" }, left: { label: "Left" } }} value={style.align} onChange={(align) => setStyle({ align })} />
        <Field label="Headline">
          <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} placeholder="e.g. Fitness creator helping busy moms get strong" />
        </Field>
        <div>
          <span className="label">Tags</span>
          {doc.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-sm">
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} className="px-1 text-neutral-400 hover:text-red-600" onClick={() => setTags(doc.tags.filter((x) => x !== t))}>✕</button>
                </span>
              ))}
            </div>
          )}
          {doc.tags.length < LIMITS.tags && (
            <div className="flex gap-2">
              <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} maxLength={30} placeholder="e.g. Fitness, Mom life, Recipes" aria-label="New tag" />
              <button type="button" className="btn-secondary" onClick={addTag}>Add</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    // Clicks are swallowed so links in the preview don't navigate away from unsaved changes.
    <div className="h-[600px] w-[300px] shrink-0 overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl" onClickCapture={(e) => e.preventDefault()}>
      <div className="h-full overflow-y-auto rounded-[1.8rem]">{children}</div>
    </div>
  );
}

export function MediaKitBuilder({ creator, initial, updatedAt }: {
  creator: KitCreator;
  initial: { headline: string; published: boolean; doc: KitDoc };
  updatedAt: Date;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveMediaKit, undefined);
  const [doc, setDoc] = useState(initial.doc);
  const [headline, setHeadline] = useState(initial.headline);
  const [published, setPublished] = useState(initial.published);
  const [tab, setTab] = useState<"sections" | "style">("sections");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const setBlocks = (f: (blocks: Block[]) => Block[]) => setDoc((d) => ({ ...d, blocks: f(d.blocks) }));
  const update = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const move = (i: number, d: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const add = (t: BlockType) => {
    const b: BlockOf<BlockType> = newBlock(t);
    setBlocks((bs) => [...bs, b]);
    setOpenId(b.id);
  };
  const remove = (b: Block) => {
    if (confirm(`Delete the "${b.title || BLOCKS[b.type].label}" section?`)) setBlocks((bs) => bs.filter((x) => x.id !== b.id));
  };

  const preview = (
    <Phone>
      <MediaKitView creator={creator} headline={headline} doc={doc} updatedAt={updatedAt} preview className="min-h-full" />
    </Phone>
  );

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <form action={action} className="min-w-0 flex-1 space-y-5">
        <input type="hidden" name="kit" value={JSON.stringify({ headline, published, doc })} />

        <label className="card flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
          Show my media kit (anyone with the link can see it)
        </label>

        <div className="flex gap-1 rounded-xl bg-neutral-200/70 p-1" role="tablist">
          {(["sections", "style"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === t ? "bg-white shadow-sm" : "text-neutral-600"}`}>
              {t === "sections" ? "Sections" : "Style"}
            </button>
          ))}
        </div>

        <button type="button" className="btn-secondary w-full lg:hidden" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
        {showPreview && <div className="flex justify-center lg:hidden">{preview}</div>}

        {tab === "sections" ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">Add the sections you want, put them in any order, and hide the ones you&apos;re not ready to show. Empty sections stay hidden from brands.</p>
            {doc.blocks.map((b, i) => (
              <BlockCard
                key={b.id}
                b={b}
                open={openId === b.id}
                first={i === 0}
                last={i === doc.blocks.length - 1}
                onToggle={() => setOpenId((o) => (o === b.id ? null : b.id))}
                onChange={(patch) => update(b.id, patch)}
                onMove={(d) => move(i, d)}
                onDelete={() => remove(b)}
              />
            ))}
            <AddSection onAdd={add} disabled={doc.blocks.length >= LIMITS.blocks} />
          </div>
        ) : (
          <StylePanel
            doc={doc}
            creator={creator}
            headline={headline}
            setHeadline={setHeadline}
            setStyle={(patch) => setDoc((d) => ({ ...d, style: { ...d.style, ...patch } }))}
            setTags={(tags) => setDoc((d) => ({ ...d, tags }))}
          />
        )}

        <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border">
          <Submit>Save media kit</Submit>
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
          {state?.ok && <span className="text-sm text-green-700">{state.ok}</span>}
        </div>
      </form>
      <div className="sticky top-6 hidden lg:block">{preview}</div>
    </div>
  );
}
