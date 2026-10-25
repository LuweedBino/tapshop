import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { QuickActions } from "@/components/AdminCreatorForms";

export const dynamic = "force-dynamic";

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function Admin() {
  const admin = await requireAdmin();
  const [creators, sales] = await Promise.all([
    db.creator.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, displayName: true, email: true, handle: true, bio: true, createdAt: true, stripeAccountId: true, stripeReady: true, pausedAt: true,
        _count: { select: { products: { where: { archived: false } }, leads: true } },
      },
    }),
    db.order.groupBy({ by: ["creatorId", "currency"], where: { status: "PAID" }, _sum: { amountCents: true }, _count: true }),
  ]);

  // Per creator: number of paid orders and revenue per currency.
  const byCreator = new Map<string, { count: number; totals: string[] }>();
  const allTotals = new Map<string, number>();
  for (const s of sales) {
    const entry = byCreator.get(s.creatorId) ?? { count: 0, totals: [] };
    entry.count += s._count;
    entry.totals.push(money(s._sum.amountCents ?? 0, s.currency));
    byCreator.set(s.creatorId, entry);
    allTotals.set(s.currency, (allTotals.get(s.currency) ?? 0) + (s._sum.amountCents ?? 0));
  }
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const tiles = [
    ["Creators", String(creators.length)],
    ["New this week", String(creators.filter((c) => c.createdAt >= weekAgo).length)],
    ["Stripe connected", String(creators.filter((c) => c.stripeReady).length)],
    ["All-time sales", [...allTotals].map(([cur, cents]) => money(cents, cur)).join(" · ") || money(0)],
  ];

  return (
    <>
      <PageHeader title="Admin" subtitle="Everyone who has signed up for TapShop, newest first. Use the buttons under each name for quick edits, or click the name for everything else. Only you can see this page." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums md:text-2xl">{value}</p>
          </div>
        ))}
      </div>
      {creators.length === 0 ? (
        <div className="card py-12 text-center text-sm text-neutral-500">No creators yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Creator</th>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
                <th className="px-4 py-3 text-right font-medium">Products</th>
                <th className="px-4 py-3 text-right font-medium">Leads</th>
                <th className="px-4 py-3 text-right font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {creators.map((c) => {
                const s = byCreator.get(c.id);
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/admin/creators/${c.id}`} className="font-medium underline-offset-2 hover:underline">{c.displayName}</Link>
                      {c.pausedAt && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Paused</span>}
                      <p className="text-xs text-neutral-500">{c.email}</p>
                      <QuickActions creator={c} isSelf={c.id === admin.id} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/${c.handle}`} target="_blank" className="font-medium text-neutral-700 underline-offset-2 hover:underline">/{c.handle} ↗</Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.stripeReady ? (
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Connected</span>
                      ) : c.stripeAccountId ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-400" />Started</span>
                      ) : (
                        <span className="text-neutral-400">Not started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c._count.products}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c._count.leads}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {s ? <>{s.totals.join(" · ")} <span className="text-xs text-neutral-500">({s.count})</span></> : <span className="text-neutral-400">–</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{date(c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
