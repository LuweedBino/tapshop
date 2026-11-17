import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCreator } from "@/lib/auth";
import { designOf } from "@/lib/design";
import { money } from "@/lib/format";
import { commissionPercent } from "@/lib/affiliates";
import { joinAffiliateProgram } from "@/app/actions/affiliates";
import { StoreFooter, StoreHeader, StoreShell } from "@/components/Storefront";
import { Submit } from "@/components/Submit";

export const dynamic = "force-dynamic";

async function load(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    include: { products: { where: { published: true, archived: false, type: "DIGITAL", priceCents: { gt: 0 } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const creator = await load((await params).handle);
  return creator && !creator.pausedAt ? { title: `Become an affiliate for ${creator.displayName} | TapShop` } : {};
}

const BUTTON = "block w-full rounded-[var(--btn-radius)] bg-[var(--accent)] py-3 text-center text-sm font-semibold text-[var(--on-accent)]";
const CARD = "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card)] p-5 text-[var(--card-text)]";

export default async function JoinAffiliates({ params }: { params: Promise<{ handle: string }> }) {
  const creator = await load((await params).handle);
  if (!creator || creator.pausedAt) notFound();
  const me = await getCreator();
  const joined = me ? await db.affiliate.findUnique({ where: { creatorId_memberId: { creatorId: creator.id, memberId: me.id } } }) : null;
  const products = creator.products.filter((p) => commissionPercent(creator, p) > 0);
  const here = `/${creator.handle}/affiliates`;

  return (
    <StoreShell design={designOf(creator)}>
      <main className="mx-auto max-w-md">
        <StoreHeader creator={creator} page={{ title: `Sell ${creator.displayName}'s products`, description: "Share your own link and earn a cut of every sale it brings in." }} />
        <div className="mt-6 space-y-3 px-4">
          {!creator.affiliateOn ? (
            <div className={`${CARD} text-center text-sm`}>{creator.displayName} isn&apos;t taking new affiliates right now.</div>
          ) : (
            <>
              <div className={CARD}>
                <p className="text-3xl font-black">{creator.affiliatePercent}%</p>
                <p className="mt-1 text-sm text-[var(--card-muted)]">
                  of every sale from your link, for {creator.affiliateDays} days after someone taps it. Paid automatically to your Stripe account.
                </p>
              </div>
              {products.length > 0 && (
                <ul className={`${CARD} divide-y divide-[var(--card-border)] p-0`}>
                  {products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="min-w-0 truncate font-medium">{p.title}</span>
                      <span className="shrink-0 text-[var(--card-muted)]">
                        you earn <strong className="text-[var(--card-text)]">{money(Math.floor((p.priceCents * commissionPercent(creator, p)) / 100), p.currency)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {creator.affiliateNote && <div className={`${CARD} whitespace-pre-line text-sm`}>{creator.affiliateNote}</div>}

              {me?.id === creator.id ? (
                <Link href="/dashboard/affiliates" className={BUTTON}>This is your program · manage it</Link>
              ) : joined ? (
                <Link href="/dashboard/promote" className={BUTTON}>You&apos;re in · get your links</Link>
              ) : me ? (
                <form action={joinAffiliateProgram.bind(null, creator.id)}>
                  <Submit className={BUTTON} pendingText="Joining…">Join and get my links</Submit>
                </form>
              ) : (
                <>
                  <Link href={`/signup?next=${encodeURIComponent(here)}`} className={BUTTON}>Create a free account to join</Link>
                  <p className="text-center text-sm text-[var(--page-muted)]">
                    Have a TapShop account? <Link href={`/login?next=${encodeURIComponent(here)}`} className="font-semibold underline">Sign in</Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
        <StoreFooter />
      </main>
    </StoreShell>
  );
}
