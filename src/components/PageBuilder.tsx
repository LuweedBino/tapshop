"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { Page, Product } from "@prisma/client";
import { deletePage, savePageBuilder } from "@/app/actions/pages";
import type { FormState } from "@/app/actions/auth";
import { BUTTON_STYLES, FONTS, LAYOUTS, THEMES } from "@/lib/design";
import { SLUG_PATTERN } from "@/lib/pages";
import { uploadFile } from "@/lib/upload";
import {
  ALIGNS, BACKGROUNDS, BLOCK_TYPES, HEADER_BANNERS, MAX_BLOCKS, MAX_FAQ, MAX_FOOTER_LINKS, MAX_GALLERY_IMAGES, SIZES,
  newBlock, newBlockId, type Block, type BlockType, type PageDesign,
} from "@/lib/pageDesign";
import { PageView, type PageCreator } from "./PageView";
import { BannerEditor } from "./BannerEditor";
import { Segmented } from "./Segmented";
import { Slider } from "./Slider";
import { Submit } from "./Submit";

const SWATCHES = ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#2563eb", "#171717"];

// A card that folds open and shut.
function Panel({ title, hint, open = false, children }: { title: string; hint?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="card group p-0" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-neutral-500">{hint}</p>}
        </div>
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-transform group-open:rotate-180">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </summary>
      <div className="space-y-5 border-t border-neutral-100 p-5">{children}</div>
    </details>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-neutral-900" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium">
      {label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
    </label>
  );
}

/** Picks and uploads one public picture; shows it with Replace / Remove. */
function ImagePick({ value, onChange, label }: { value: string; onChange: (key: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick(file: File) {
    setBusy(true);
    setError("");
    try {
      onChange(await uploadFile(file, "public"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  }
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${value}`} alt="" className="h-16 w-16 rounded-xl object-cover" />
        )}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : value ? "Replace" : "Upload"}</button>
        {value && <button type="button" className="text-sm text-neutral-500 hover:text-red-600" onClick={() => onChange("")}>Remove</button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GalleryPick({ keys, onChange }: { keys: string[]; onChange: (keys: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function add(files: File[]) {
    setBusy(true);
    const added: string[] = [];
    for (const f of files.slice(0, MAX_GALLERY_IMAGES - keys.length)) {
      try { added.push(await uploadFile(f, "public")); } catch {}
    }
    onChange([...keys, ...added]);
    setBusy(false);
  }
  return (
    <div>
      <span className="label">Pictures ({keys.length}/{MAX_GALLERY_IMAGES})</span>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k, i) => (
          <div key={k + i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${k}`} alt="" className="aspect-square w-full rounded-lg object-cover" />
            <button type="button" aria-label="Remove picture" onClick={() => onChange(keys.filter((_, j) => j !== i))} className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/70 text-xs text-white">✕</button>
          </div>
        ))}
        {keys.length < MAX_GALLERY_IMAGES && (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-sm text-neutral-500">
            {busy ? "…" : "+ Add"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) add(f); }} />
    </div>
  );
}

function BlockFields({ b, set }: { b: Block; set: (b: Block) => void }) {
  switch (b.type) {
    case "products":
      return (
        <div>
          <label className="label">Title above the products (optional)</label>
          <input className="input" value={b.title} maxLength={120} onChange={(e) => set({ ...b, title: e.target.value })} placeholder="e.g. Shop the collection" />
          <p className="mt-1 text-xs text-neutral-500">Shows the products you add to this page, in the order set on the Products page.</p>
        </div>
      );
    case "heading":
      return (
        <>
          <input className="input" value={b.text} maxLength={200} onChange={(e) => set({ ...b, text: e.target.value })} />
          <Segmented label="Size" options={SIZES} value={b.size} onChange={(v) => set({ ...b, size: v })} />
          <Segmented label="Align" options={ALIGNS} value={b.align} onChange={(v) => set({ ...b, align: v })} />
        </>
      );
    case "text":
      return (
        <>
          <textarea className="input min-h-28" value={b.text} maxLength={3000} onChange={(e) => set({ ...b, text: e.target.value })} />
          <Segmented label="Align" options={ALIGNS} value={b.align} onChange={(v) => set({ ...b, align: v })} />
        </>
      );
    case "image":
      return (
        <>
          <ImagePick value={b.key} onChange={(k) => set({ ...b, key: k })} />
          <Segmented label="Shape" options={{ wide: { label: "Wide" }, square: { label: "Square" }, tall: { label: "Tall" } }} value={b.shape} onChange={(v) => set({ ...b, shape: v })} />
          <input className="input" value={b.caption} maxLength={200} onChange={(e) => set({ ...b, caption: e.target.value })} placeholder="Caption (optional)" />
          <input className="input" value={b.link} maxLength={2000} onChange={(e) => set({ ...b, link: e.target.value })} placeholder="Link when tapped (optional)" inputMode="url" />
        </>
      );
    case "gallery":
      return (
        <>
          <GalleryPick keys={b.keys} onChange={(keys) => set({ ...b, keys })} />
          <Segmented label="Columns" options={{ "2": { label: "2" }, "3": { label: "3" } }} value={String(b.columns) as "2" | "3"} onChange={(v) => set({ ...b, columns: v === "2" ? 2 : 3 })} />
        </>
      );
    case "video":
      return <input className="input" value={b.url} maxLength={500} onChange={(e) => set({ ...b, url: e.target.value })} placeholder="Paste a YouTube, Vimeo, Loom, TikTok or Instagram link" inputMode="url" />;
    case "button":
      return (
        <>
          <input className="input" value={b.label} maxLength={60} onChange={(e) => set({ ...b, label: e.target.value })} placeholder="Button text" />
          <input className="input" value={b.url} maxLength={2000} onChange={(e) => set({ ...b, url: e.target.value })} placeholder="https://…" inputMode="url" />
          <Segmented label="Style" options={{ solid: { label: "Filled" }, outline: { label: "Outline" } }} value={b.style} onChange={(v) => set({ ...b, style: v })} />
        </>
      );
    case "quote":
      return (
        <>
          <textarea className="input min-h-24" value={b.text} maxLength={600} onChange={(e) => set({ ...b, text: e.target.value })} placeholder="What they said" />
          <input className="input" value={b.name} maxLength={80} onChange={(e) => set({ ...b, name: e.target.value })} placeholder="Their name" />
          <Slider label="Stars" min={0} max={5} step={1} value={b.stars} display={b.stars ? "★".repeat(b.stars) : "None"} onChange={(v) => set({ ...b, stars: v })} />
        </>
      );
    case "faq":
      return (
        <div className="space-y-3">
          {b.items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-neutral-200 p-3">
              <input className="input" value={it.q} maxLength={200} placeholder="Question" onChange={(e) => set({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <textarea className="input min-h-20" value={it.a} maxLength={1500} placeholder="Answer" onChange={(e) => set({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
              <button type="button" className="text-sm text-neutral-500 hover:text-red-600" onClick={() => set({ ...b, items: b.items.filter((_, j) => j !== i) })}>Remove question</button>
            </div>
          ))}
          {b.items.length < MAX_FAQ && <button type="button" className="btn-secondary" onClick={() => set({ ...b, items: [...b.items, { q: "", a: "" }] })}>+ Add a question</button>}
        </div>
      );
    case "countdown":
      return (
        <>
          <input className="input" value={b.label} maxLength={80} onChange={(e) => set({ ...b, label: e.target.value })} placeholder="e.g. Sale ends in" />
          <div>
            <label className="label">Counts down to</label>
            <input type="datetime-local" className="input" value={b.to} onChange={(e) => set({ ...b, to: e.target.value })} />
          </div>
        </>
      );
    case "spacer":
      return <Segmented label="Height" options={SIZES} value={b.size} onChange={(v) => set({ ...b, size: v })} />;
    case "divider":
      return null;
  }
}

export function PageBuilder({ page, initial, creator, products, appUrl }: {
  page: Page;
  initial: PageDesign;
  creator: PageCreator;
  products: Product[];
  appUrl: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(savePageBuilder.bind(null, page.id), undefined);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [description, setDescription] = useState(page.description);
  const [d, setD] = useState<PageDesign>(initial);
  const [showPreview, setShowPreview] = useState(false);
  const [adding, setAdding] = useState(false);

  const look = d.look;
  const setLook = (p: Partial<PageDesign["look"]>) => setD((x) => ({ ...x, look: { ...x.look, ...p } }));
  const setBg = (p: Partial<PageDesign["background"]>) => setD((x) => ({ ...x, background: { ...x.background, ...p } }));
  const setHeader = (p: Partial<PageDesign["header"]>) => setD((x) => ({ ...x, header: { ...x.header, ...p } }));
  const setFooter = (p: Partial<PageDesign["footer"]>) => setD((x) => ({ ...x, footer: { ...x.footer, ...p } }));
  const setBlock = (i: number, b: Block) => setD((x) => ({ ...x, blocks: x.blocks.map((y, j) => (j === i ? b : y)) }));
  const moveBlock = (i: number, dir: -1 | 1) =>
    setD((x) => {
      const j = i + dir;
      if (j < 0 || j >= x.blocks.length) return x;
      const blocks = [...x.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...x, blocks };
    });
  const addBlock = (t: BlockType) => {
    setD((x) => ({ ...x, blocks: [...x.blocks, newBlock(t)].slice(0, MAX_BLOCKS) }));
    setAdding(false);
  };

  const preview = (
    <div className="h-[640px] w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl theme-light" onClickCapture={(e) => e.preventDefault()}>
      <div className="si-force-motion h-full overflow-y-auto rounded-[1.8rem]">
        <PageView design={d} creator={creator} title={title} description={description} products={products} className="min-h-full" preview />
      </div>
    </div>
  );

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <form action={action} className="min-w-0 flex-1 space-y-4">
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="design" value={JSON.stringify(d)} />

        <button type="button" className="btn-secondary w-full lg:hidden" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
        {showPreview && <div className="flex justify-center lg:hidden">{preview}</div>}

        <Panel title="Page info" hint="Name, link and the words at the top." open>
          <div>
            <label className="label" htmlFor="pb-title">Page name</label>
            <input className="input" id="pb-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="pb-slug">Link</label>
            <div className="flex items-center rounded-xl border border-neutral-300 bg-white pl-3.5 focus-within:border-neutral-900">
              <span className="shrink-0 text-neutral-400">{appUrl.replace(/^https?:\/\//, "")}/{creator.handle}/</span>
              <input id="pb-slug" className="w-full bg-transparent py-2.5 pr-3.5 text-[16px] outline-none" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required pattern={SLUG_PATTERN} maxLength={40} autoCapitalize="none" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Changing it breaks the old link.</p>
          </div>
          <div>
            <label className="label" htmlFor="pb-desc">Description (optional)</label>
            <textarea className="input" id="pb-desc" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown under the page name" />
          </div>
        </Panel>

        <Panel title="Look" hint="Colors, theme, font, buttons and product layout.">
          <Segmented label="Style" options={{ store: { label: "Same as my store" }, custom: { label: "Custom for this page" } }} value={look.custom ? "custom" : "store"} onChange={(v) => setLook({ custom: v === "custom" })} />
          {look.custom && (
            <>
              <div>
                <span className="label">Accent color</span>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button key={c} type="button" aria-label={c} onClick={() => setLook({ accentColor: c })} className={`h-9 w-9 rounded-full ${look.accentColor === c ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`} style={{ background: c }} />
                  ))}
                  <input type="color" value={look.accentColor} onChange={(e) => setLook({ accentColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
                </div>
              </div>
              <Segmented label="Theme" options={THEMES} value={look.theme} onChange={(v) => setLook({ theme: v })} />
              <Segmented label="Font" options={FONTS} value={look.font} onChange={(v) => setLook({ font: v })} />
              <Segmented label="Button shape" options={BUTTON_STYLES} value={look.buttonStyle} onChange={(v) => setLook({ buttonStyle: v })} />
              <Segmented label="Product layout" options={LAYOUTS} value={look.layout} onChange={(v) => setLook({ layout: v })} />
            </>
          )}
        </Panel>

        <Panel title="Background" hint="A color, a gradient or your own picture behind the page.">
          <Segmented label="Background" options={BACKGROUNDS} value={d.background.kind} onChange={(v) => setBg({ kind: v })} />
          {(d.background.kind === "color" || d.background.kind === "gradient") && <ColorField label={d.background.kind === "gradient" ? "Top color" : "Color"} value={d.background.color} onChange={(v) => setBg({ color: v })} />}
          {d.background.kind === "gradient" && (
            <>
              <ColorField label="Bottom color" value={d.background.color2} onChange={(v) => setBg({ color2: v })} />
              <Slider label="Direction" min={0} max={360} step={15} value={d.background.angle} display={`${d.background.angle}°`} onChange={(v) => setBg({ angle: v })} />
            </>
          )}
          {d.background.kind === "image" && (
            <>
              <ImagePick label="Background picture" value={d.background.imageKey} onChange={(k) => setBg({ imageKey: k })} />
              <Slider label="Darken" min={0} max={90} step={5} value={d.background.dim} display={`${d.background.dim}%`} onChange={(v) => setBg({ dim: v })} />
            </>
          )}
        </Panel>

        <Panel title="Header" hint="Banner, photo, name and social links at the top.">
          <Toggle label="Show the header" checked={d.header.show} onChange={(v) => setHeader({ show: v })} />
          {d.header.show && (
            <>
              <Segmented label="Banner" options={HEADER_BANNERS} value={d.header.banner} onChange={(v) => setHeader({ banner: v })} />
              {d.header.banner === "custom" && (
                <BannerEditor
                  initialKey={d.header.bannerKey || null}
                  bannerKey={d.header.bannerKey}
                  onKeyChange={(k) => setHeader({ bannerKey: k })}
                  accent={look.custom ? look.accentColor : creator.accentColor}
                  value={d.header.bannerStyle}
                  onChange={(s) => setHeader({ bannerStyle: s })}
                />
              )}
              <Toggle label="Show my profile photo" checked={d.header.showAvatar} onChange={(v) => setHeader({ showAvatar: v })} />
              <Toggle label="Show my name" checked={d.header.showName} onChange={(v) => setHeader({ showName: v })} />
              <Toggle label="Show my social links" checked={d.header.showSocials} onChange={(v) => setHeader({ showSocials: v })} />
              <Segmented label="Page name size" options={SIZES} value={d.header.titleSize} onChange={(v) => setHeader({ titleSize: v })} />
              <Segmented label="Align" options={ALIGNS} value={d.header.align} onChange={(v) => setHeader({ align: v })} />
            </>
          )}
        </Panel>

        <Panel title="Sections" hint="Build the page from blocks: products, text, pictures, videos, buttons and more." open>
          <ul className="space-y-3">
            {d.blocks.map((b, i) => (
              <li key={b.id} className="rounded-2xl border border-neutral-200">
                <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2">
                  <span aria-hidden>{BLOCK_TYPES[b.type].icon}</span>
                  <span className="flex-1 text-sm font-semibold">{BLOCK_TYPES[b.type].label}</span>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveBlock(i, -1)} className="px-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-20">▲</button>
                  <button type="button" aria-label="Move down" disabled={i === d.blocks.length - 1} onClick={() => moveBlock(i, 1)} className="px-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-20">▼</button>
                  <button
                    type="button"
                    aria-label="Duplicate"
                    title="Duplicate"
                    disabled={d.blocks.length >= MAX_BLOCKS}
                    onClick={() => setD((x) => ({ ...x, blocks: [...x.blocks.slice(0, i + 1), { ...b, id: newBlockId() }, ...x.blocks.slice(i + 1)] }))}
                    className="px-1.5 text-neutral-500 hover:text-neutral-900 disabled:opacity-20"
                  >
                    ⧉
                  </button>
                  <button type="button" aria-label="Remove" title="Remove" onClick={() => setD((x) => ({ ...x, blocks: x.blocks.filter((_, j) => j !== i) }))} className="px-1.5 text-neutral-400 hover:text-red-600">✕</button>
                </div>
                {b.type !== "divider" && <div className="space-y-3 p-3"><BlockFields b={b} set={(nb) => setBlock(i, nb)} /></div>}
              </li>
            ))}
          </ul>
          {d.blocks.length < MAX_BLOCKS && (adding ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Add a section</p>
                <button type="button" className="text-sm text-neutral-500" onClick={() => setAdding(false)}>Cancel</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(BLOCK_TYPES) as BlockType[]).map((t) => (
                  <button key={t} type="button" onClick={() => addBlock(t)} className="rounded-xl border border-neutral-200 p-3 text-left transition hover:border-neutral-500">
                    <span className="block text-lg" aria-hidden>{BLOCK_TYPES[t].icon}</span>
                    <span className="block text-sm font-semibold">{BLOCK_TYPES[t].label}</span>
                    <span className="block text-xs text-neutral-500">{BLOCK_TYPES[t].hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="btn w-full" onClick={() => setAdding(true)}>+ Add a section</button>
          ))}
        </Panel>

        <Panel title="Footer" hint="Links, a note and the bottom of the page.">
          <Toggle label="Show the footer" checked={d.footer.show} onChange={(v) => setFooter({ show: v })} />
          {d.footer.show && (
            <>
              <div>
                <label className="label">Footer note (optional)</label>
                <textarea className="input" rows={2} maxLength={300} value={d.footer.text} onChange={(e) => setFooter({ text: e.target.value })} placeholder="e.g. © 2026 Your Brand · Questions? hello@you.com" />
              </div>
              <div className="space-y-2">
                <span className="label">Footer links</span>
                {d.footer.links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input" value={l.label} maxLength={60} placeholder="Label" onChange={(e) => setFooter({ links: d.footer.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input className="input" value={l.url} maxLength={2000} placeholder="https://…" inputMode="url" onChange={(e) => setFooter({ links: d.footer.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                    <button type="button" aria-label="Remove link" className="px-1 text-neutral-400 hover:text-red-600" onClick={() => setFooter({ links: d.footer.links.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                {d.footer.links.length < MAX_FOOTER_LINKS && <button type="button" className="btn-secondary" onClick={() => setFooter({ links: [...d.footer.links, { label: "", url: "" }] })}>+ Add a link</button>}
              </div>
              <Toggle label="Show my social links" checked={d.footer.showSocials} onChange={(v) => setFooter({ showSocials: v })} />
              <Toggle label='Show "Made with TapShopUGC"' checked={d.footer.madeWith} onChange={(v) => setFooter({ madeWith: v })} />
            </>
          )}
        </Panel>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <Submit>Save page</Submit>
          <Link href={`/${creator.handle}/${page.slug}`} target="_blank" className="btn-secondary">View page ↗</Link>
          {state?.ok && <span className="text-sm font-medium text-green-700">{state.ok}</span>}
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      <aside className="sticky top-8 hidden shrink-0 lg:block">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">Live preview</p>
        {preview}
        <form className="mt-4 text-center" action={deletePage.bind(null, page.id)} onSubmit={(e) => { if (!confirm(`Delete the "${page.title}" page? Its products move to your main store as Hidden, so nothing is lost.`)) e.preventDefault(); }}>
          <button className="text-sm font-medium text-red-600 hover:underline">Delete this page</button>
        </form>
      </aside>
      <form className="mt-6 lg:hidden" action={deletePage.bind(null, page.id)} onSubmit={(e) => { if (!confirm(`Delete the "${page.title}" page? Its products move to your main store as Hidden, so nothing is lost.`)) e.preventDefault(); }}>
        <button className="text-sm font-medium text-red-600 hover:underline">Delete this page</button>
      </form>
    </div>
  );
}
