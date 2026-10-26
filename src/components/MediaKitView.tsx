import type { Creator, MediaKit } from "@prisma/client";
import { fileUrl } from "@/lib/format";
import { designOf } from "@/lib/design";
import { formatCount, parseKit, type KitShare } from "@/lib/mediaKit";
import { PLATFORMS } from "@/lib/socials";
import { Avatar, StoreFooter, StoreShell } from "./Storefront";
import { SocialIcon } from "./SocialIcon";
import { InquiryForm } from "./InquiryForm";

const CARD = "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 text-[var(--card-text)] shadow-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--card-muted)]">{title}</h2>
      {children}
    </section>
  );
}

function Bars({ items }: { items: KitShare[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-sm"><span>{s.label}</span><span className="font-semibold tabular-nums">{s.pct}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(s.pct, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaKitView({ creator, kit }: { creator: Creator; kit: MediaKit }) {
  const d = parseKit(kit.data);
  const reach = d.stats.reduce((sum, s) => sum + s.followers, 0);
  const updated = kit.updatedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const genderRows = d.gender ? ([["Women", d.gender.women], ["Men", d.gender.men], ["Other", d.gender.other]] as const).filter(([, p]) => p > 0).map(([label, pct]) => ({ label, pct })) : [];
  return (
    <StoreShell design={designOf(creator)}>
      <main className="mx-auto max-w-xl space-y-4 px-4 pb-4 pt-10">
        <header className="flex flex-col items-center text-center">
          <Avatar creator={creator} />
          <p className="mt-4 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--on-accent)]">Media kit</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{creator.displayName}</h1>
          {kit.headline && <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[var(--page-muted)]">{kit.headline}</p>}
          <a href="#work-with-me" className="mt-5 rounded-[var(--btn-radius)] bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--on-accent)] transition hover:opacity-90">Work with me</a>
        </header>

        {d.stats.length > 0 && (
          <Section title="Reach">
            {d.stats.length > 1 && (
              <div className="mb-4 text-center">
                <p className="text-4xl font-black tabular-nums">{formatCount(reach)}</p>
                <p className="text-sm text-[var(--card-muted)]">total followers</p>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {d.stats.map((s, i) => (
                <div key={i} className="rounded-[calc(var(--card-radius)*0.75)] border border-[var(--card-border)] p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <SocialIcon kind={s.kind} size={16} />
                    {PLATFORMS[s.kind].label}
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
          </Section>
        )}

        {kit.about && (
          <Section title="About">
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{kit.about}</p>
          </Section>
        )}

        {(genderRows.length > 0 || d.ages.length > 0 || d.locations.length > 0) && (
          <Section title="Audience">
            <div className="grid gap-6 sm:grid-cols-2">
              {genderRows.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Gender</h3><Bars items={genderRows} /></div>}
              {d.ages.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Age</h3><Bars items={d.ages} /></div>}
              {d.locations.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">Top locations</h3><Bars items={d.locations} /></div>}
            </div>
          </Section>
        )}

        {d.partnerships.length > 0 && (
          <Section title="Brands I've worked with">
            <div className="grid gap-3 sm:grid-cols-2">
              {d.partnerships.map((p, i) => {
                const logo = fileUrl(p.logoKey || null);
                const body = (
                  <>
                    <div className="flex items-center gap-3">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-full border border-[var(--card-border)] bg-white object-contain" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-bold text-[var(--accent)]">{p.brand.slice(0, 1).toUpperCase()}</span>
                      )}
                      <span className="font-semibold">{p.brand}{p.url && " ↗"}</span>
                    </div>
                    {p.description && <p className="mt-2 text-sm text-[var(--card-muted)]">{p.description}</p>}
                  </>
                );
                const cls = "block rounded-[calc(var(--card-radius)*0.75)] border border-[var(--card-border)] p-3";
                return p.url ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:-translate-y-0.5`}>{body}</a> : <div key={i} className={cls}>{body}</div>;
              })}
            </div>
          </Section>
        )}

        {d.services.length > 0 && (
          <Section title="Rates">
            <ul className="divide-y divide-[var(--card-border)]">
              {d.services.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="mt-0.5 text-sm text-[var(--card-muted)]">{s.description}</p>}
                  </div>
                  <p className="shrink-0 font-bold text-[var(--accent)]">{s.price || "Ask me"}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.gallery.length > 0 && (
          <Section title="Gallery">
            <div className="grid grid-cols-3 gap-2">
              {d.gallery.map((key) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={key} src={fileUrl(key)!} alt="" loading="lazy" className="aspect-square w-full rounded-[calc(var(--card-radius)*0.5)] object-cover" />
              ))}
            </div>
          </Section>
        )}

        <div id="work-with-me" className="scroll-mt-4">
          <Section title="Work with me">
            <InquiryForm creatorId={creator.id} creatorName={creator.displayName} />
          </Section>
        </div>
        <p className="text-center text-xs text-[var(--page-muted)]">Stats last updated {updated}</p>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
