import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { HOLD_DAYS, joinLink, statsOf } from "@/lib/affiliates";
import { setAffiliateBlocked } from "@/app/actions/affiliates";
import { PageHeader } from "@/components/PageHeader";
import { CopyLink } from "@/components/CopyLink";
import { AffiliateProgramForm, MessageAffiliatesForm } from "@/components/AffiliateProgramForms";

export const dynamic = "force-dynamic";

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STATUS: Record<string, { label: string; tone: string }> = {
  HELD: { label: "Waiting", tone: "bg-amber-100 text-amber-800" },
  PAID: { label: "Paid", tone: "bg-green-100 text-green-800" },
  CANCELED: { label: "Canceled", tone: "bg-neutral-100 text-neutral-500" },
  NONE: { label: "Not paid yet", tone: "bg-neutral-100 text-neutral-500" },
};

export default async function Affiliates() {
  const creator = await requireCreator();
  const [affiliates, recent, messages] = await Promise.all([
    db.affiliate.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { displayName: true, handle: true, stripeAccountId: true } },
        orders: { select: { status: true, amountCents: true, commissionCents: true, commissionStatus: true } },
      },
    }),
    db.order.findMany({
      where: { creatorId: creator.id, affiliateId: { not: null }, status: { in: ["PAID", "REFUNDED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: { select: { title: true } }, affiliate: { include: { member: { select: { displayName: true } } } } },
    }),
    db.affiliateMessage.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const rows = affiliates.map((a) => ({ ...a, stats: statsOf(a.orders) }));
  const total = statsOf(affiliates.flatMap((a) => a.orders));
  const clicks = affiliates.reduce((n, a) => n + a.clicks, 0);
  const active = affiliates.filter((a) => !a.blockedAt).length;
  const tiles: [string, string][] = [
    ["Affiliates", String(active)],
    ["Link clicks", String(clicks)],
    ["Sales from affiliates", `${total.sales} · ${money(total.revenue)}`],
    ["Commission waiting / paid", `${money(total.held)} / ${money(total.paid)}`],
  ];

  return (
    <>
      <PageHeader title="Affiliates" subtitle="Let other creators sell your products for a cut of each sale." />
      <div className="space-y-6">
        {!creator.stripeReady && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Affiliates only earn on paid sales through Stripe. <Link href="/dashboard/payments" className="font-semibold underline">Connect Stripe</Link> to start.
          </p>
        )}

        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold">Your affiliate sign-up page</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {creator.affiliateOn ? "Share this link with people who want to promote your products." : "Turn on your program below, then share this link."}
            </p>
          </div>
          <CopyLink url={joinLink(creator.handle)} />
        </div>

        <AffiliateProgramForm on={creator.affiliateOn} percent={creator.affiliatePercent} days={creator.affiliateDays} note={creator.affiliateNote} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="card">
              <p className="text-xs font-medium text-neutral-500">{label}</p>
              <p className="mt-1 text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold">Your affiliates</h2>
          {rows.length === 0 ? (
            <div className="card py-10 text-center text-sm text-neutral-500">No affiliates yet. Share your sign-up page to get your first one.</div>
          ) : (
            <ul className="space-y-3">
              {rows.map((a) => (
                <li key={a.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {a.member.displayName}
                        {a.blockedAt && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Blocked</span>}
                        {!a.member.stripeAccountId && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">No Stripe yet</span>}
                      </p>
                      <p className="text-sm text-neutral-500">
                        <Link href={`/${a.member.handle}`} className="hover:underline" target="_blank">@{a.member.handle}</Link> · joined {date(a.createdAt)}
                      </p>
                    </div>
                    <form action={setAffiliateBlocked.bind(null, a.id, !a.blockedAt)}>
                      <button className="text-sm font-medium text-neutral-600 hover:text-neutral-900">{a.blockedAt ? "Unblock" : "Block"}</button>
                    </form>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
                    {[
                      ["Clicks", String(a.clicks)],
                      ["Sales", String(a.stats.sales)],
                      ["Sold", money(a.stats.revenue)],
                      ["Waiting", money(a.stats.held)],
                      ["Paid", money(a.stats.paid)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-neutral-50 px-2.5 py-2">
                        <dt className="text-xs text-neutral-500">{k}</dt>
                        <dd className="font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Recent affiliate sales</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Each affiliate&apos;s cut is set aside when the sale happens and sent to their Stripe account {HOLD_DAYS} days later. A refund cancels it.
            </p>
          </div>
          {recent.length === 0 ? (
            <div className="card py-10 text-center text-sm text-neutral-500">No affiliate sales yet.</div>
          ) : (
            <ul className="card divide-y divide-neutral-100 p-0">
              {recent.map((o) => {
                const s = STATUS[o.commissionStatus] ?? STATUS.NONE;
                return (
                  <li key={o.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.product.title}</p>
                      <p className="text-xs text-neutral-500">
                        {o.affiliate?.member.displayName ?? "Removed affiliate"} · {date(o.createdAt)} · sale {money(o.amountCents, o.currency)}
                        {o.status === "REFUNDED" && " · refunded"}
                      </p>
                      {o.commissionNote && o.commissionStatus !== "PAID" && <p className="mt-0.5 text-xs text-neutral-500">{o.commissionNote}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{money(o.commissionCents, o.currency)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.tone}`}>{s.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {active > 0 && <MessageAffiliatesForm count={active} />}
        {messages.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold">Messages you sent</h2>
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="card">
                  <p className="font-medium">{m.subject}</p>
                  <p className="text-xs text-neutral-500">{date(m.createdAt)}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{m.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
