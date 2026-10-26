import type { Creator } from "@prisma/client";
import { fileUrl } from "@/lib/format";
import { designOf, type Design } from "@/lib/design";
import { formatCount, type Block, type BlockOf, type KitDoc } from "@/lib/mediaKit";
import { videoEmbed } from "@/lib/affiliate";
import { PLATFORMS } from "@/lib/socials";
import { Avatar, StoreFooter, StoreShell } from "./Storefront";
import { SocialIcon } from "./SocialIcon";
import { InquiryForm } from "./InquiryForm";

type KitCreator = Pick<Creator, "id" | "displayName" | "avatarKey" | "avatarStyle" | "accentColor" | "theme" | "font" | "buttonStyle" | "layout">;

const INNER = "rounded-[calc(var(--card-radius)*0.75)] border border-[var(--card-border)]";

function Bars({ items }: { items: { label: string; pct: number }[] }) {
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

function Stats({ b }: { b: BlockOf<"stats"> }) {
  const reach = b.items.reduce((sum, s) => sum + s.followers, 0);
  return (
    <>
      {b.showTotal && b.items.length > 1 && (
        <div className="mb-4 text-center">
          <p className="text-4xl font-black tabular-nums">{formatCount(reach)}</p>
          <p className="text-sm text-[var(--card-muted)]">total followers</p>
        </div>
      )}
      <div className="grid gap-2 @md:grid-cols-2">
        {b.items.map((s) => (
          <div key={s.id} className={`${INNER} p-3`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SocialIcon kind={s.kind as keyof typeof PLATFORMS} size={16} />
              {PLATFORMS[s.kind as keyof typeof PLATFORMS].label}
              {s.handle && <span className="truncate font-normal text-[var(--card-muted)]">{s.handle}</span>}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{formatCount(s.followers)} <span className="text-sm font-normal text-[var(--card-muted)]">followers</span></p>
            {(s.avgViews !== null || s.engagement !== null) && (
              <p className="mt-0.5 text-sm text-[var(--card-muted)]">
                {s.avgViews !== null && <>{formatCount(s.avgViews)} avg views</>}
                {s.avgViews !== null && s.engagement !== null && " · "}
                {s.engagement !== null && <>{s.engagement}% engagement</>}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Brands({ b }: { b: BlockOf<"brands"> }) {
  const logo = (p: (typeof b.items)[number], size: string) => {
    const src = fileUrl(p.logoKey || null);
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`${size} shrink-0 rounded-full border border-[var(--card-border)] bg-white object-contain`} />
    ) : (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-bold text-[var(--accent)]`}>{p.brand.slice(0, 1).toUpperCase()}</span>
    );
  };
  const wrap = (p: (typeof b.items)[number], cls: string, body: React.ReactNode) =>
    p.url ? <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:-translate-y-0.5`}>{body}</a> : <div key={p.id} className={cls}>{body}</div>;
  if (b.layout === "logos") {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        {b.items.map((p) => wrap(p, "flex w-20 flex-col items-center gap-1.5 text-center", <>{logo(p, "h-16 w-16 text-xl")}<span className="text-xs font-semibold leading-tight">{p.brand}</span></>))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 @md:grid-cols-2">
      {b.items.map((p) =>
        wrap(p, `block ${INNER} p-3`, (
          <>
            <div className="flex items-center gap-3">{logo(p, "h-11 w-11")}<span className="font-semibold">{p.brand}{p.url && " ↗"}</span></div>
            {p.description && <p className="mt-2 text-sm text-[var(--card-muted)]">{p.description}</p>}
          </>
        )),
      )}
    </div>
  );
}

function BlockBody({ b, creator, preview }: { b: Block; creator: KitCreator; preview: boolean }) {
  switch (b.type) {
    case "stats":
      return <Stats b={b} />;
    case "highlights":
      return (
        <div className={`grid gap-3 ${b.items.length > 1 ? "grid-cols-2" : ""}`}>
          {b.items.map((h) => (
            <div key={h.id} className={`${INNER} p-4 text-center`}>
              <p className="text-3xl font-black text-[var(--accent)]">{h.value}</p>
              <p className="mt-1 text-sm text-[var(--card-muted)]">{h.label}</p>
            </div>
          ))}
        </div>
      );
    case "text":
      return <p className="whitespace-pre-line text-[15px] leading-relaxed">{b.body}</p>;
    case "audience": {
      const g = b.gender ? ([["Women", b.gender.women], ["Men", b.gender.men], ["Other", b.gender.other]] as const).filter(([, p]) => p > 0).map(([label, pct]) => ({ label, pct })) : [];
      return (
        <div className="grid gap-6 @md:grid-cols-2">
          {g.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Gender</h3><Bars items={g} /></div>}
          {b.ages.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Age</h3><Bars items={b.ages} /></div>}
          {b.locations.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Top locations</h3><Bars items={b.locations} /></div>}
        </div>
      );
    }
    case "brands":
      return <Brands b={b} />;
    case "testimonials":
      return (
        <div className="space-y-3">
          {b.items.map((t) => (
            <figure key={t.id} className={`${INNER} p-4`}>
              <blockquote className="text-[15px] leading-relaxed">
                <span className="mr-1 text-2xl font-black leading-none text-[var(--accent)]">“</span>
                {t.quote}
              </blockquote>
              {(t.name || t.role) && (
                <figcaption className="mt-2 text-sm"><span className="font-semibold">{t.name}</span>{t.role && <span className="text-[var(--card-muted)]">{t.name && ", "}{t.role}</span>}</figcaption>
              )}
            </figure>
          ))}
        </div>
      );
    case "rates":
      return (
        <>
          <ul className="divide-y divide-[var(--card-border)]">
            {b.items.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  {r.description && <p className="mt-0.5 text-sm text-[var(--card-muted)]">{r.description}</p>}
                </div>
                <p className="shrink-0 font-bold text-[var(--accent)]">{r.price || "Ask me"}</p>
              </li>
            ))}
          </ul>
          {b.note && <p className="mt-3 text-sm text-[var(--card-muted)]">{b.note}</p>}
        </>
      );
    case "gallery":
      return (
        <div className={`grid gap-2 ${b.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {b.images.map((key) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={key} src={fileUrl(key)!} alt="" loading="lazy" className="aspect-square w-full rounded-[calc(var(--card-radius)*0.5)] object-cover" />
          ))}
        </div>
      );
    case "video": {
      const src = videoEmbed(b.url);
      return (
        <>
          {src ? (
            <div className="aspect-video overflow-hidden rounded-[calc(var(--card-radius)*0.75)] bg-black">
              <iframe src={src} title={b.title || "Video"} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
            </div>
          ) : (
            <p className="text-sm text-[var(--card-muted)]">Add a YouTube, Vimeo or Loom link.</p>
          )}
          {b.caption && <p className="mt-2 text-sm text-[var(--card-muted)]">{b.caption}</p>}
        </>
      );
    }
    case "links":
      return (
        <div className="space-y-2">
          {b.items.map((l) => (
            <a key={l.id} href={l.url || "#"} target="_blank" rel="noopener noreferrer" className="block rounded-[var(--btn-radius)] border-2 border-[var(--accent)] py-3 text-center font-semibold text-[var(--accent)] transition hover:opacity-80">
              {l.label || l.url}
            </a>
          ))}
        </div>
      );
    case "contact":
      return (
        <>
          {b.intro && <p className="mb-4 text-[15px] leading-relaxed">{b.intro}</p>}
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
    case "video": return !b.url.trim();
    case "contact": return false;
    default: return !b.items.length;
  }
}

export function MediaKitView({ creator, headline, doc, updatedAt, preview = false, className }: {
  creator: KitCreator;
  headline: string;
  doc: KitDoc;
  updatedAt: Date;
  preview?: boolean;
  className?: string;
}) {
  const { style } = doc;
  const store = designOf(creator);
  const design: Design = { ...store, accentColor: style.accent ?? store.accentColor, theme: style.theme ?? store.theme, font: style.font ?? store.font };
  const cover = fileUrl(style.coverKey || null);
  const left = style.align === "left";
  const blocks = doc.blocks.filter((b) => !b.hidden && (preview || !isEmpty(b)));
  const section = style.sections === "cards" ? "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 text-[var(--card-text)] shadow-sm" : "border-t border-[var(--card-border)] py-6 first:border-t-0";
  const hasContact = blocks.some((b) => b.type === "contact");
  return (
    <StoreShell design={{ ...design, accentColor: design.accentColor }} className={className}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-44 w-full object-cover sm:h-56" />
      )}
      <main className={`@container mx-auto max-w-xl px-4 pb-4 ${cover ? "" : "pt-10"} ${style.sections === "cards" ? "space-y-4" : ""}`}>
        <header className={`flex flex-col ${left ? "items-start text-left" : "items-center text-center"} ${cover && style.showAvatar ? "-mt-12" : cover ? "pt-6" : ""} ${style.sections === "flat" ? "pb-6" : ""}`}>
          {style.showAvatar && <Avatar creator={creator} />}
          <p className="mt-4 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--on-accent)]">Media kit</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{creator.displayName}</h1>
          {headline && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--page-muted)]">{headline}</p>}
          {doc.tags.length > 0 && (
            <div className={`mt-3 flex flex-wrap gap-1.5 ${left ? "" : "justify-center"}`}>
              {doc.tags.map((t) => <span key={t} className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-2.5 py-0.5 text-xs font-semibold text-[var(--card-text)]">{t}</span>)}
            </div>
          )}
          {hasContact && <a href="#work-with-me" className="mt-5 rounded-[var(--btn-radius)] bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] transition hover:opacity-90">Work with me</a>}
        </header>

        {blocks.map((b) => (
          <section key={b.id} id={b.type === "contact" ? "work-with-me" : undefined} className={`${section} scroll-mt-4`}>
            {b.title && <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--card-muted)]">{b.title}</h2>}
            <BlockBody b={b} creator={creator} preview={preview} />
          </section>
        ))}
        {blocks.length === 0 && <p className="py-10 text-center text-sm text-[var(--page-muted)]">Add sections to build your media kit.</p>}

        <p className="pt-2 text-center text-xs text-[var(--page-muted)]">Last updated {updatedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
