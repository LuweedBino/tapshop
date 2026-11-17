import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { affiliateLink, commissionPercent, HOLD_DAYS, statsOf } from "@/lib/affiliates";
import { PageHeader } from "@/components/PageHeader";
import { CopyLink } from "@/components/CopyLink";
import { ConnectStripeButton } from "@/components/ConnectStripeButton";

export const dynamic = "force-dynamic";

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function Promote() {
  const me = await requireCreator();
  const programs = await db.affiliate.findMany({
    where: { memberId: me.id },
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true, displayName: true, handle: true, affiliateOn: true, affiliatePercent: true, affiliateNote: true, pausedAt: true,
          products: { where: { published: true, archived: false, type: "DIGITAL", priceCents: { gt: 0 } }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
          affiliateMessages: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      orders: { select: { status: true, amountCents: true, commissionCents: true, commissionStatus: true, commissionNote: true } },
    },
  });

  // Commissions go to the affiliate's own Stripe account, which needs Stripe's "transfers" ability switched on.
  let canReceive = false;
  if (stripeEnabled() && me.stripeAccountId) {
    const account = await stripe().accounts.retrieve(me.stripeAccountId).catch(() => null);
    canReceive = account?.capabilities?.transfers === "active";
  }
  const all = statsOf(programs.flatMap((p) => p.orders));

  return (
    <>
      <PageHeader title="Promote" subtitle="Share other creators' products with your links and earn a cut of every sale." />
      <div className="space-y-6">
        {programs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Sales", String(all.sales)],
              ["Earned", money(all.earned)],
              ["Waiting", money(all.held)],
              ["Paid to you", money(all.paid)],
            ].map(([label, value]) => (
              <div key={label} className="card">
                <p className="text-xs font-medium text-neutral-500">{label}</p>
                <p className="mt-1 text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {stripeEnabled() && !canReceive && (
          <div className="card">
            <p className="font-semibold">Get paid automatically</p>
            <p className="mt-1 text-sm text-neutral-500">
              Your commissions are sent to your own Stripe account {HOLD_DAYS} days after each sale. Until Stripe is set up, they wait for you.
            </p>
            {me.stripeAccountId ? (
              <ConnectStripeButton label="Set up affiliate payouts" />
            ) : (
              <Link href="/dashboard/payments" className="btn mt-4">Connect Stripe</Link>
            )}
          </div>
        )}

        {programs.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="font-semibold">You&apos;re not promoting anyone yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
              Ask a creator for their affiliate sign-up link (it looks like tapshopugc.com/their-name/affiliates), then tap Join.
            </p>
          </div>
        ) : (
          programs.map((p) => {
            const stats = statsOf(p.orders);
            const live = p.creator.affiliateOn && !p.creator.pausedAt && !p.blockedAt;
            const products = p.creator.products.filter((x) => commissionPercent(p.creator, x) > 0);
            const notes = [...new Set(p.orders.filter((o) => o.commissionStatus === "HELD" && o.commissionNote).map((o) => o.commissionNote))];
            return (
              <section key={p.id} className="card space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{p.creator.displayName}</h2>
                    <p className="text-sm text-neutral-500">
                      <Link href={`/${p.creator.handle}`} target="_blank" className="hover:underline">@{p.creator.handle}</Link> · you earn {p.creator.affiliatePercent}% · joined {date(p.createdAt)}
                    </p>
                  </div>
                  {!live && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">{p.blockedAt ? "Removed" : "Paused"}</span>}
                </div>

                <dl className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
                  {[
                    ["Clicks", String(p.clicks)],
                    ["Sales", String(stats.sales)],
                    ["Earned", money(stats.earned)],
                    ["Waiting", money(stats.held)],
                    ["Paid", money(stats.paid)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-neutral-50 px-2.5 py-2">
                      <dt className="text-xs text-neutral-500">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                {notes.map((n) => <p key={n} className="text-xs text-neutral-500">{n}</p>)}

                {live && (
                  <div className="space-y-3">
                    <div>
                      <p className="label">Link to the whole store</p>
                      <CopyLink url={affiliateLink(p.code)} />
                    </div>
                    {products.map((x) => (
                      <div key={x.id}>
                        <p className="label">
                          {x.title} · {money(x.priceCents, x.currency)} · you earn {money(Math.floor((x.priceCents * commissionPercent(p.creator, x)) / 100), x.currency)}
                        </p>
                        <CopyLink url={affiliateLink(p.code, x.id)} />
                      </div>
                    ))}
                  </div>
                )}

                {p.creator.affiliateNote && (
                  <div>
                    <p className="label">From {p.creator.displayName}</p>
                    <p className="whitespace-pre-line rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">{p.creator.affiliateNote}</p>
                  </div>
                )}
                {p.creator.affiliateMessages.filter((m) => m.createdAt >= p.createdAt).map((m) => (
                  <div key={m.id} className="rounded-xl border border-neutral-200 px-4 py-3">
                    <p className="text-sm font-semibold">{m.subject}</p>
                    <p className="text-xs text-neutral-500">{date(m.createdAt)}</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-700">{m.body}</p>
                  </div>
                ))}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
