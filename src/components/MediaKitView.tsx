import type { Creator } from "@prisma/client";
import { fileUrl } from "@/lib/format";
import { designOf, onColor, type Design } from "@/lib/design";
import { formatCount, type Block, type BlockOf, type KitDoc, type KitStat, type KitStyle } from "@/lib/mediaKit";
import { isVerticalVideo, videoEmbed } from "@/lib/affiliate";
import { PLATFORMS } from "@/lib/socials";
import { Avatar, StoreFooter, StoreShell } from "./Storefront";
import { SocialIcon } from "./SocialIcon";
import { InquiryForm } from "./InquiryForm";

export type KitCreator = Pick<Creator, "id" | "displayName" | "avatarKey" | "avatarStyle" | "accentColor" | "theme" | "font" | "buttonStyle" | "layout">;

const INNER = "rounded-[calc(var(--card-radius)*0.75)] border border-[var(--card-border)]";
const SOFT = "rounded-[calc(var(--card-radius)*0.75)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]";
const MUTED = "text-[var(--card-muted)]";
/** A row that scrolls sideways with snapping, for swipeable layouts. */
const SWIPE = "-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]";

type Share = { label: string; pct: number };

function Bars({ items }: { items: Share[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((s, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm"><span>{s.label}</span><span className="font-semibold tabular-nums">{s.pct}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(s.pct, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Ring({ s }: { s: Share }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative h-20 w-20 rounded-full" style={{ background: `conic-gradient(var(--accent) ${Math.min(s.pct, 100) * 3.6}deg, color-mix(in srgb, var(--accent) 14%, transparent) 0)` }}>
        <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-[var(--card)] text-sm font-bold tabular-nums">{s.pct}%</div>
      </div>
      <span className="text-xs font-semibold leading-tight">{s.label}</span>
    </div>
  );
}

function Shares({ items, layout }: { items: Share[]; layout: BlockOf<"audience">["layout"] }) {
  switch (layout) {
    case "rings":
      return <div className="flex flex-wrap justify-center gap-4">{items.map((s, i) => <Ring key={i} s={s} />)}</div>;
    case "numbers":
      return (
        <div className="grid grid-cols-3 gap-3">
          {items.map((s, i) => (
            <div key={i}>
              <p className="text-2xl font-black tabular-nums text-[var(--accent)] @md:text-3xl">{s.pct}%</p>
              <p className={`text-xs ${MUTED}`}>{s.label}</p>
            </div>
          ))}
        </div>
      );
    case "chips":
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((s, i) => (
            <span key={i} className="rounded-full border border-[var(--card-border)] px-3 py-1 text-sm">{s.label} <b className="text-[var(--accent)]">{s.pct}%</b></span>
          ))}
        </div>
      );
    default:
      return <Bars items={items} />;
  }
}

const platform = (s: KitStat) => PLATFORMS[s.kind as keyof typeof PLATFORMS];

function StatMeta({ s }: { s: KitStat }) {
  if (s.avgViews === null && s.engagement === null) return null;
  return (
    <p className={`text-sm ${MUTED}`}>
      {s.avgViews !== null && <>{formatCount(s.avgViews)} avg views</>}
      {s.avgViews !== null && s.engagement !== null && " · "}
      {s.engagement !== null && <>{s.engagement}% engagement</>}
    </p>
  );
}

function Stats({ b }: { b: BlockOf<"stats"> }) {
  const reach = b.items.reduce((sum, s) => sum + s.followers, 0);
  const items = b.items as KitStat[];
  const total = b.showTotal && b.items.length > 1 && (
    <div className="mb-4 text-center">
      <p className={`${b.layout === "big" ? "text-6xl" : "text-4xl"} font-black tabular-nums`}>{formatCount(reach)}</p>
      <p className={`text-sm ${MUTED}`}>total followers</p>
    </div>
  );
  let body: React.ReactNode;
  if (b.layout === "list") {
    body = (
      <ul className="divide-y divide-[var(--card-border)]">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${SOFT}`}><SocialIcon kind={s.kind} size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{platform(s).label} {s.handle && <span className={`font-normal ${MUTED}`}>{s.handle}</span>}</p>
              <StatMeta s={s} />
            </div>
            <p className="text-xl font-black tabular-nums">{formatCount(s.followers)}</p>
          </li>
        ))}
      </ul>
    );
  } else if (b.layout === "big") {
    body = (
      <div className="space-y-5 text-center">
        {items.map((s) => (
          <div key={s.id}>
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold"><SocialIcon kind={s.kind} size={16} /> {s.handle || platform(s).label}</p>
            <p className="text-5xl font-black tabular-nums text-[var(--accent)]">{formatCount(s.followers)}</p>
            <StatMeta s={s} />
          </div>
        ))}
      </div>
    );
  } else if (b.layout === "chips") {
    body = (
      <div className="flex flex-wrap justify-center gap-2">
        {items.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-sm">
            <SocialIcon kind={s.kind} size={15} /> <b className="tabular-nums">{formatCount(s.followers)}</b>
          </span>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="grid gap-2 @md:grid-cols-2">
        {items.map((s) => (
          <div key={s.id} className={`${INNER} p-3`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SocialIcon kind={s.kind} size={16} />
              {platform(s).label}
              {s.handle && <span className={`truncate font-normal ${MUTED}`}>{s.handle}</span>}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatCount(s.followers)} <span className={`text-sm font-normal ${MUTED}`}>followers</span></p>
            <div className="mt-0.5"><StatMeta s={s} /></div>
          </div>
        ))}
      </div>
    );
  }
  return <>{total}{body}</>;
}

type Brand = BlockOf<"brands">["items"][number];

function Logo({ p, size }: { p: Brand; size: string }) {
  const src = fileUrl(p.logoKey || null);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} shrink-0 rounded-full border border-[var(--card-border)] bg-white object-contain`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-bold text-[var(--accent)]`}>{p.brand.slice(0, 1).toUpperCase()}</span>
  );
}

function Brands({ b }: { b: BlockOf<"brands"> }) {
  const wrap = (p: Brand, cls: string, body: React.ReactNode) =>
    p.url ? <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:-translate-y-0.5`}>{body}</a> : <div key={p.id} className={cls}>{body}</div>;
  switch (b.layout) {
    case "logos":
      return (
        <div className="flex flex-wrap justify-center gap-4">
          {b.items.map((p) => wrap(p, "flex w-20 flex-col items-center gap-1.5 text-center", <><Logo p={p} size="h-16 w-16 text-xl" /><span className="text-xs font-semibold leading-tight">{p.brand}</span></>))}
        </div>
      );
    case "grid":
      return (
        <div className="grid grid-cols-3 gap-2">
          {b.items.map((p) => wrap(p, `flex aspect-square flex-col items-center justify-center gap-2 p-2 text-center ${SOFT}`, <><Logo p={p} size="h-12 w-12 text-lg" /><span className="line-clamp-1 text-xs font-semibold">{p.brand}</span></>))}
        </div>
      );
    case "list":
      return (
        <ul className="divide-y divide-[var(--card-border)]">
          {b.items.map((p) => (
            <li key={p.id} className="py-3 first:pt-0 last:pb-0">
              {wrap(p, "flex items-center gap-3", <><Logo p={p} size="h-9 w-9 text-sm" /><span className="min-w-0 flex-1"><span className="block font-semibold">{p.brand}</span>{p.description && <span className={`block truncate text-sm ${MUTED}`}>{p.description}</span>}</span>{p.url && <span className={MUTED}>↗</span>}</>)}
            </li>
          ))}
        </ul>
      );
    case "marquee":
      // The list is drawn twice so the strip loops without a gap.
      return (
        <div className="-mx-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="mk-marquee flex w-max gap-6">
            {[...b.items, ...b.items].map((p, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap font-semibold" aria-hidden={i >= b.items.length}><Logo p={p} size="h-10 w-10 text-base" />{p.brand}</span>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div className="grid gap-3 @md:grid-cols-2">
          {b.items.map((p) =>
            wrap(p, `block ${INNER} p-3`, (
              <>
                <div className="flex items-center gap-3"><Logo p={p} size="h-11 w-11" /><span className="font-semibold">{p.brand}{p.url && " ↗"}</span></div>
                {p.description && <p className={`mt-2 text-sm ${MUTED}`}>{p.description}</p>}
              </>
            )),
          )}
        </div>
      );
  }
}

function Highlights({ b }: { b: BlockOf<"highlights"> }) {
  switch (b.layout) {
    case "row":
      return (
        <div className="flex flex-wrap justify-around gap-y-4 divide-x divide-[var(--card-border)]">
          {b.items.map((h) => (
            <div key={h.id} className="min-w-24 flex-1 px-2 text-center">
              <p className="text-2xl font-black text-[var(--accent)]">{h.value}</p>
              <p className={`text-xs ${MUTED}`}>{h.label}</p>
            </div>
          ))}
        </div>
      );
    case "stacked":
      return (
        <div className="space-y-4">
          {b.items.map((h) => (
            <div key={h.id} className="flex items-baseline gap-3">
              <p className="text-5xl font-black leading-none tracking-tight">{h.value}</p>
              <p className={`text-sm ${MUTED}`}>{h.label}</p>
            </div>
          ))}
        </div>
      );
    case "badges":
      return (
        <div className="flex flex-wrap gap-2">
          {b.items.map((h) => (
            <span key={h.id} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-[var(--on-accent)]"><b>{h.value}</b> {h.label}</span>
          ))}
        </div>
      );
    default:
      return (
        <div className={`grid gap-3 ${b.items.length > 1 ? "grid-cols-2" : ""}`}>
          {b.items.map((h) => (
            <div key={h.id} className={`${INNER} p-4 text-center`}>
              <p className="text-3xl font-black text-[var(--accent)]">{h.value}</p>
              <p className={`mt-1 text-sm ${MUTED}`}>{h.label}</p>
            </div>
          ))}
        </div>
      );
  }
}

function Testimonials({ b }: { b: BlockOf<"testimonials"> }) {
  const by = (t: (typeof b.items)[number]) =>
    (t.name || t.role) && <figcaption className="mt-2 text-sm"><span className="font-semibold">{t.name}</span>{t.role && <span className={MUTED}>{t.name && ", "}{t.role}</span>}</figcaption>;
  switch (b.layout) {
    case "big":
      return (
        <div className="space-y-8">
          {b.items.map((t) => (
            <figure key={t.id} className="text-center">
              <p className="text-6xl font-black leading-none text-[var(--accent)]" aria-hidden>“</p>
              <blockquote className="-mt-2 text-xl font-semibold leading-snug tracking-tight">{t.quote}</blockquote>
              {by(t)}
            </figure>
          ))}
        </div>
      );
    case "carousel":
      return (
        <div className={SWIPE}>
          {b.items.map((t) => (
            <figure key={t.id} className={`${INNER} w-[85%] shrink-0 snap-center p-4`}>
              <blockquote className="text-[15px] leading-relaxed">“{t.quote}”</blockquote>
              {by(t)}
            </figure>
          ))}
        </div>
      );
    case "bubbles":
      return (
        <div className="space-y-4">
          {b.items.map((t, i) => (
            <figure key={t.id} className={`flex flex-col ${i % 2 ? "items-end text-right" : "items-start"}`}>
              <blockquote className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${i % 2 ? "rounded-br-sm bg-[var(--accent)] text-[var(--on-accent)]" : "rounded-bl-sm bg-[color-mix(in_srgb,var(--card-text)_8%,transparent)]"}`}>{t.quote}</blockquote>
              {by(t)}
            </figure>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-3">
          {b.items.map((t) => (
            <figure key={t.id} className={`${INNER} p-4`}>
              <blockquote className="text-[15px] leading-relaxed">
                <span className="mr-1 text-2xl font-black leading-none text-[var(--accent)]">“</span>
                {t.quote}
              </blockquote>
              {by(t)}
            </figure>
          ))}
        </div>
      );
  }
}

function Rates({ b }: { b: BlockOf<"rates"> }) {
  const price = (r: (typeof b.items)[number]) => r.price || "Ask me";
  let body: React.ReactNode;
  switch (b.layout) {
    case "cards":
      body = (
        <div className="grid gap-3 @md:grid-cols-2">
          {b.items.map((r, i) => (
            <div key={r.id} className={`flex flex-col p-4 ${i === 0 ? "rounded-[calc(var(--card-radius)*0.75)] bg-[var(--accent)] text-[var(--on-accent)]" : INNER}`}>
              <p className="font-semibold">{r.name}</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{price(r)}</p>
              {r.description && <p className={`mt-2 text-sm ${i === 0 ? "opacity-85" : MUTED}`}>{r.description}</p>}
            </div>
          ))}
        </div>
      );
      break;
    case "menu":
      body = (
        <ul className="space-y-3">
          {b.items.map((r) => (
            <li key={r.id}>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="flex-1 border-b-2 border-dotted border-[var(--card-border)]" />
                <span className="font-bold text-[var(--accent)]">{price(r)}</span>
              </div>
              {r.description && <p className={`text-sm ${MUTED}`}>{r.description}</p>}
            </li>
          ))}
        </ul>
      );
      break;
    case "table":
      body = (
        <div className={`${INNER} overflow-hidden`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-xs uppercase tracking-wider">
              <tr><th className="px-3 py-2 font-bold">What you get</th><th className="px-3 py-2 text-right font-bold">Price</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {b.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2.5"><span className="font-semibold">{r.name}</span>{r.description && <span className={`block text-xs ${MUTED}`}>{r.description}</span>}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{price(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      break;
    default:
      body = (
        <ul className="divide-y divide-[var(--card-border)]">
          {b.items.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-semibold">{r.name}</p>
                {r.description && <p className={`mt-0.5 text-sm ${MUTED}`}>{r.description}</p>}
              </div>
              <p className="shrink-0 font-bold text-[var(--accent)]">{price(r)}</p>
            </li>
          ))}
        </ul>
      );
  }
  return <>{body}{b.note && <p className={`mt-3 text-sm ${MUTED}`}>{b.note}</p>}</>;
}

function Gallery({ b }: { b: BlockOf<"gallery"> }) {
  const img = (key: string, cls: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={key} src={fileUrl(key)!} alt="" loading="lazy" className={cls} />
  );
  const r = "rounded-[calc(var(--card-radius)*0.5)]";
  switch (b.layout) {
    case "masonry":
      return <div className={`${b.columns === 2 ? "columns-2" : "columns-3"} gap-2 [&>img]:mb-2`}>{b.images.map((k) => img(k, `w-full break-inside-avoid ${r}`))}</div>;
    case "carousel":
      return <div className={SWIPE}>{b.images.map((k) => img(k, `aspect-[4/5] w-[70%] shrink-0 snap-center object-cover ${r}`))}</div>;
    case "collage":
      return (
        <div className="grid grid-cols-3 gap-2">
          {b.images.map((k, i) => img(k, `w-full object-cover ${r} ${i === 0 ? "col-span-2 row-span-2 aspect-square h-full" : "aspect-square"}`))}
        </div>
      );
    case "polaroid":
      return (
        <div className="flex flex-wrap justify-center gap-3 py-2">
          {b.images.map((k, i) => (
            <div key={k} className="w-[42%] bg-white p-1.5 pb-5 shadow-lg" style={{ transform: `rotate(${[-4, 3, -2, 5, -3, 2][i % 6]}deg)` }}>
              {img(k, "aspect-square w-full object-cover")}
            </div>
          ))}
        </div>
      );
    default:
      return <div className={`grid gap-2 ${b.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{b.images.map((k) => img(k, `aspect-square w-full object-cover ${r}`))}</div>;
  }
}

function Links({ b }: { b: BlockOf<"links"> }) {
  const a = (l: (typeof b.items)[number], cls: string, body?: React.ReactNode) => (
    <a key={l.id} href={l.url || "#"} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:opacity-80`}>{body ?? (l.label || l.url)}</a>
  );
  switch (b.layout) {
    case "solid":
      return <div className="space-y-2">{b.items.map((l) => a(l, "block rounded-[var(--btn-radius)] bg-[var(--accent)] py-3 text-center font-semibold text-[var(--on-accent)]"))}</div>;
    case "pills":
      return <div className="flex flex-wrap gap-2">{b.items.map((l) => a(l, "rounded-full border border-[var(--card-border)] px-4 py-2 text-sm font-semibold"))}</div>;
    case "cards":
      return (
        <div className="grid gap-2 @md:grid-cols-2">
          {b.items.map((l) => a(l, `flex items-center justify-between gap-3 p-4 ${SOFT}`, <><span className="font-semibold">{l.label || l.url}</span><span className="text-xl text-[var(--accent)]">→</span></>))}
        </div>
      );
    case "text":
      return <ul className="space-y-2">{b.items.map((l) => <li key={l.id}>{a(l, "font-semibold text-[var(--accent)] underline decoration-2 underline-offset-4", <>{l.label || l.url} ↗</>)}</li>)}</ul>;
    default:
      return <div className="space-y-2">{b.items.map((l) => a(l, "block rounded-[var(--btn-radius)] border-2 border-[var(--accent)] py-3 text-center font-semibold text-[var(--accent)]"))}</div>;
  }
}

type Clip = BlockOf<"video">["items"][number];

/** One embedded player. Tall players (TikTok, Reels, Shorts) keep their shape in every layout;
 * in a full-width column (not `cell`) they're narrowed so they don't fill the whole screen. */
function Player({ v, className = "", tall, cell = false }: { v: Clip; className?: string; tall?: boolean; cell?: boolean }) {
  const src = videoEmbed(v.url, { social: true });
  const vertical = tall ?? (src ? isVerticalVideo(src, v.url) : false);
  return (
    <div className={`${vertical ? `mx-auto aspect-[9/16] ${cell ? "" : "max-w-[62%]"}` : "aspect-video"} w-full overflow-hidden bg-black ${className}`}>
      {src ? (
        <iframe src={src} title={v.caption || "Video"} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
      ) : (
        <p className="flex h-full items-center justify-center p-4 text-center text-sm text-white/70">Add a YouTube, TikTok, Instagram, Vimeo or Loom link.</p>
      )}
    </div>
  );
}

function Videos({ b }: { b: BlockOf<"video"> }) {
  const r = "rounded-[calc(var(--card-radius)*0.75)]";
  const cap = (v: Clip, cls = "") => v.caption && <p className={`mt-2 text-sm ${MUTED} ${cls}`}>{v.caption}</p>;
  const [first, ...rest] = b.items;
  switch (b.layout) {
    case "bleed":
      return <div className="-mx-5 space-y-4">{b.items.map((v) => <div key={v.id}><Player v={v} />{cap(v, "px-5")}</div>)}</div>;
    case "framed":
      return <div className="space-y-5">{b.items.map((v) => <div key={v.id}><Player v={v} className={`${r} border-[6px] border-[var(--accent)] shadow-xl`} />{cap(v)}</div>)}</div>;
    case "grid":
      return <div className="grid grid-cols-2 gap-3">{b.items.map((v) => <div key={v.id}><Player v={v} cell className={r} />{cap(v, "line-clamp-2 text-xs")}</div>)}</div>;
    case "carousel":
      return (
        <div className={SWIPE}>
          {b.items.map((v) => <div key={v.id} className="w-[85%] shrink-0 snap-center"><Player v={v} className={r} />{cap(v)}</div>)}
        </div>
      );
    case "featured":
      return (
        <>
          {first && <><Player v={first} className={r} />{cap(first, "font-semibold text-[var(--card-text)]")}</>}
          {rest.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {rest.map((v) => <div key={v.id}><Player v={v} cell className={r} />{cap(v, "line-clamp-2 text-xs")}</div>)}
            </div>
          )}
        </>
      );
    case "shorts":
      return (
        <div className={SWIPE}>
          {b.items.map((v) => <div key={v.id} className="w-[58%] shrink-0 snap-center"><Player v={v} tall cell className={r} />{cap(v, "line-clamp-2 text-xs")}</div>)}
        </div>
      );
    case "cinema":
      return (
        <div className="space-y-4">
          {b.items.map((v, i) => (
            <figure key={v.id} className={`${r} bg-neutral-950 p-3 text-white shadow-2xl`}>
              <Player v={v} className="rounded-[calc(var(--card-radius)*0.5)]" />
              <figcaption className="mt-3 flex items-center gap-2 px-1 text-sm">
                <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--on-accent)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-semibold">{v.caption || "Watch"}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case "list":
      return (
        <ul className="space-y-3">
          {b.items.map((v) => (
            <li key={v.id} className={`flex items-center gap-3 ${INNER} p-2`}>
              <div className="w-[45%] shrink-0"><Player v={v} cell className="rounded-[calc(var(--card-radius)*0.5)]" /></div>
              <p className="min-w-0 flex-1 text-sm font-semibold">{v.caption || "Video"}</p>
            </li>
          ))}
        </ul>
      );
    default:
      return <div className="space-y-5">{b.items.map((v) => <div key={v.id}><Player v={v} className={r} />{cap(v)}</div>)}</div>;
  }
}

function TextBody({ b }: { b: BlockOf<"text"> }) {
  switch (b.layout) {
    case "large":
      return <p className="whitespace-pre-line text-xl font-medium leading-snug tracking-tight">{b.body}</p>;
    case "quote":
      return <blockquote className="whitespace-pre-line border-l-4 border-[var(--accent)] pl-4 text-lg italic leading-relaxed">{b.body}</blockquote>;
    case "dropcap":
      return <p className="whitespace-pre-line text-[15px] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-[var(--accent)]">{b.body}</p>;
    default:
      return <p className="whitespace-pre-line text-[15px] leading-relaxed">{b.body}</p>;
  }
}

function BlockBody({ b, creator, preview }: { b: Block; creator: KitCreator; preview: boolean }) {
  switch (b.type) {
    case "stats":
      return <Stats b={b} />;
    case "highlights":
      return <Highlights b={b} />;
    case "text":
      return <TextBody b={b} />;
    case "audience": {
      const g = b.gender ? ([["Women", b.gender.women], ["Men", b.gender.men], ["Other", b.gender.other]] as const).filter(([, p]) => p > 0).map(([label, pct]) => ({ label, pct })) : [];
      const group = (title: string, items: Share[]) => items.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">{title}</h3><Shares items={items} layout={b.layout} /></div>;
      return (
        <div className={`grid gap-6 ${b.layout === "bars" ? "@md:grid-cols-2" : ""}`}>
          {group("Gender", g)}
          {group("Age", b.ages)}
          {group("Top locations", b.locations)}
        </div>
      );
    }
    case "brands":
      return <Brands b={b} />;
    case "testimonials":
      return <Testimonials b={b} />;
    case "rates":
      return <Rates b={b} />;
    case "gallery":
      return <Gallery b={b} />;
    case "video":
      return <Videos b={b} />;
    case "links":
      return <Links b={b} />;
    case "contact":
      return (
        <>
          {b.layout === "spotlight" ? (
            <div className="mb-5 text-center">
              <p className="text-3xl font-black tracking-tight">Let&apos;s work together</p>
              {b.intro && <p className={`mx-auto mt-2 max-w-sm text-[15px] leading-relaxed ${MUTED}`}>{b.intro}</p>}
            </div>
          ) : (
            b.intro && <p className="mb-4 text-[15px] leading-relaxed">{b.intro}</p>
          )}
          <InquiryForm creatorId={creator.id} creatorName={creator.displayName} preview={preview} />
        </>
      );
  }
}

/** True when a block has nothing to show yet, so visitors never see an empty box. */
function isEmpty(b: Block) {
  switch (b.type) {
    case "text": return !b.body.trim();
    case "audience": return !b.gender && !b.ages.length && !b.locations.length;
    case "gallery": return !b.images.length;
    case "contact": return false;
    default: return !b.items.length;
  }
}

/** A section with its own color: the accent and the solid-color box both follow it. */
function sectionAccent(c: string) {
  const on = onColor(c);
  return { "--accent": c, "--on-accent": on, "--a0": c, "--a1": on } as React.CSSProperties;
}

const CORNER_RADIUS = { sharp: ["0.25rem", "0.25rem"], soft: ["0.875rem", "0.75rem"], round: ["1.75rem", "9999px"] } as const;

/** The style classes and variables for a kit; shared with the builder's style samples. */
export function kitLook(style: KitStyle) {
  const corners = style.corners ? { "--card-radius": CORNER_RADIUS[style.corners][0], "--btn-radius": CORNER_RADIUS[style.corners][1] } : {};
  return {
    vars: corners as React.CSSProperties,
    stack: `mk mk-${style.spacing} mk-motion-${style.motion}`,
    backdrop: style.backdrop === "none" ? null : `mk-bg mk-bg-${style.backdrop}`,
    box: (b?: Pick<Block, "box">) => `mk-sec mk-box-${b?.box ?? style.sections}`,
    title: (b?: Pick<Block, "heading">) => `mk-t mk-t-${b?.heading ?? style.titles}`,
  };
}

export function kitDesign(creator: KitCreator, style: KitStyle): Design {
  const store = designOf(creator);
  return { ...store, accentColor: style.accent ?? store.accentColor, theme: style.theme ?? store.theme, font: style.font ?? store.font };
}

export function MediaKitView({ creator, headline, doc, updatedAt, preview = false, className = "min-h-dvh" }: {
  creator: KitCreator;
  headline: string;
  doc: KitDoc;
  updatedAt: Date;
  preview?: boolean;
  className?: string;
}) {
  const { style } = doc;
  const design = kitDesign(creator, style);
  const look = kitLook(style);
  const cover = fileUrl(style.coverKey || null);
  const left = style.align === "left";
  const boxed = style.header === "card";
  const muted = boxed ? "text-[var(--card-muted)]" : "text-[var(--page-muted)]";
  const blocks = doc.blocks.filter((b) => !b.hidden && (preview || !isEmpty(b)));
  const hasContact = blocks.some((b) => b.type === "contact");
  return (
    <StoreShell design={design} className={`relative isolate overflow-hidden ${className}`}>
      {look.backdrop && <div className={look.backdrop} aria-hidden />}
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-44 w-full object-cover sm:h-56" />
      )}
      <main className={`@container mx-auto max-w-xl px-4 pb-4 ${cover ? "" : "pt-10"} ${look.stack}`} style={look.vars}>
        <header className={`flex flex-col ${left ? "items-start text-left" : "items-center text-center"} ${boxed ? look.box() : ""} ${cover && style.showAvatar ? "-mt-12" : cover ? "mt-6" : ""}`}>
          {style.showAvatar && <Avatar creator={creator} />}
          <p className="mt-4 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--on-accent)]">Media kit</p>
          <h1 className={style.header === "hero" ? "mt-3 text-5xl font-black leading-[0.95] tracking-tighter @md:text-6xl" : "mt-2 text-3xl font-bold tracking-tight"}>{creator.displayName}</h1>
          {headline && <p className={`mt-2 max-w-md text-[15px] leading-relaxed ${muted} ${style.header === "hero" ? "mt-3 text-base" : ""}`}>{headline}</p>}
          {doc.tags.length > 0 && (
            <div className={`mt-3 flex flex-wrap gap-1.5 ${left ? "" : "justify-center"}`}>
              {doc.tags.map((t) => <span key={t} className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-0.5 text-xs font-semibold text-[var(--card-text)]">{t}</span>)}
            </div>
          )}
          {hasContact && <a href="#work-with-me" className="mt-5 rounded-[var(--btn-radius)] bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] transition hover:opacity-90">Work with me</a>}
        </header>

        {blocks.map((b) => (
          <section key={b.id} id={b.type === "contact" ? "work-with-me" : undefined} className={`${look.box(b)} scroll-mt-4 ${b.align === "center" ? "text-center" : ""}`} style={b.accent ? sectionAccent(b.accent) : undefined}>
            {b.title && <h2 className={look.title(b)}>{b.title}</h2>}
            <BlockBody b={b} creator={creator} preview={preview} />
          </section>
        ))}
        {blocks.length === 0 && <p className="py-10 text-center text-sm text-[var(--page-muted)]">Add sections to build your media kit.</p>}

        <div>
          <p className="pt-2 text-center text-xs text-[var(--page-muted)]">Last updated {updatedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <StoreFooter />
        </div>
      </main>
    </StoreShell>
  );
}
