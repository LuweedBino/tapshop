import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { QuickActions } from "@/components/AdminCreatorForms";

export const dynamic = "force-dynamic";

// 10/25/2026
const date = (d: Date) => d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

const COLUMNS = [
  { key: "creator", label: "Creator" },
  { key: "store", label: "Store" },
  { key: "stripe", label: "Stripe" },
  { key: "products", label: "Products", right: true },
  { key: "leads", label: "Leads", right: true },
  { key: "sales", label: "Sales", right: true },
  { key: "joined", label: "Joined" },
] as const;
type SortKey = (typeof COLUMNS)[number]["key"];
// Text columns start A→Z; numbers, Stripe status and dates start biggest/best/newest first.
const TEXT: SortKey[] = ["creator", "store"];

export default async function Admin({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const sort: SortKey = COLUMNS.some((c) => c.key === params.sort) ? (params.sort as SortKey) : "joined";
  const dir = params.dir === "asc" || params.dir === "desc" ? params.dir : TEXT.includes(sort) ? "asc" : "desc";
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
  const byCreator = new Map<string, { count: number; cents: number; totals: string[] }>();
  const allTotals = new Map<string, number>();
  for (const s of sales) {
    const entry = byCreator.get(s.creatorId) ?? { count: 0, cents: 0, totals: [] };
    entry.count += s._count;
    entry.totals.push(money(s._sum.amountCents ?? 0, s.currency));
    entry.cents += s._sum.amountCents ?? 0;
    byCreator.set(s.creatorId, entry);
    allTotals.set(s.currency, (allTotals.get(s.currency) ?? 0) + (s._sum.amountCents ?? 0));
  }
  // Sales sort by paid amount (summed across currencies), then by number of orders.
  const stripeRank = (c: (typeof creators)[number]) => (c.stripeReady ? 2 : c.stripeAccountId ? 1 : 0);
  const value = (c: (typeof creators)[number]): string | number => {
    switch (sort) {
      case "creator": return c.displayName.toLowerCase();
      case "store": return c.handle.toLowerCase();
      case "stripe": return stripeRank(c);
      case "products": return c._count.products;
      case "leads": return c._count.leads;
      case "sales": return (byCreator.get(c.id)?.cents ?? 0) * 1e6 + (byCreator.get(c.id)?.count ?? 0);
      case "joined": return c.createdAt.getTime();
    }
  };
  const sorted = [...creators].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    const cmp = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
    return (dir === "asc" ? cmp : -cmp) || b.createdAt.getTime() - a.createdAt.getTime();
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const tiles = [
    ["Creators", String(creators.length)],
    ["New this week", String(creators.filter((c) => c.createdAt >= weekAgo).length)],
    ["Stripe connected", String(creators.filter((c) => c.stripeReady).length)],
    ["All-time sales", [...allTotals].map(([cur, cents]) => money(cents, cur)).join(" · ") || money(0)],
  ];

  return (
    <>
      <PageHeader title="Admin" subtitle="Everyone who has signed up for TapShop. Click a column title to sort by it. Use the buttons under each creator for quick edits, or click the name for everything else. Only you can see this page." />
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
                {COLUMNS.map((col) => {
                  const active = col.key === sort;
                  const next = active ? (dir === "asc" ? "desc" : "asc") : TEXT.includes(col.key) ? "asc" : "desc";
                  return (
                    <th key={col.key} className={`px-3 py-3 font-medium ${"right" in col ? "text-right" : ""}`} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link
                        href={`/dashboard/admin?sort=${col.key}&dir=${next}`}
                        scroll={false}
                        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-neutral-900 ${active ? "text-neutral-900" : ""}`}
                      >
                        {col.label}
                        <span className={active ? "" : "text-neutral-300"} aria-hidden>{active ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
              {sorted.map((c) => {
                const s = byCreator.get(c.id);
                // One <tbody> per creator: the details row, then the buttons row under it.
                return (
                  <tbody key={c.id} className="border-t border-neutral-100 first-of-type:border-t-0">
                    <tr>
                      <td className="px-3 pb-2 pt-3">
                        <Link href={`/dashboard/admin/creators/${c.id}`} className="font-medium underline-offset-2 hover:underline">{c.displayName}</Link>
                        {c.pausedAt && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Paused</span>}
                        <p className="text-xs text-neutral-500">{c.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 pb-2 pt-3">
                        <Link href={`/${c.handle}`} target="_blank" className="font-medium text-neutral-700 underline-offset-2 hover:underline">/{c.handle} ↗</Link>
                      </td>
                      <td className="whitespace-nowrap px-3 pb-2 pt-3">
                        {c.stripeReady ? (
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Connected</span>
                        ) : c.stripeAccountId ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-400" />Started</span>
                        ) : (
                          <span className="text-neutral-400">Not started</span>
                        )}
                      </td>
                      <td className="px-3 pb-2 pt-3 text-right tabular-nums">{c._count.products}</td>
                      <td className="px-3 pb-2 pt-3 text-right tabular-nums">{c._count.leads}</td>
                      <td className="whitespace-nowrap px-3 pb-2 pt-3 text-right tabular-nums">
                        {s ? <>{s.totals.join(" · ")} <span className="text-xs text-neutral-500">({s.count})</span></> : <span className="text-neutral-400">–</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 pb-2 pt-3 text-neutral-500">{date(c.createdAt)}</td>
                    </tr>
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 pb-3">
                        <QuickActions creator={c} isSelf={c.id === admin.id} />
                      </td>
                    </tr>
                  </tbody>
                );
              })}
          </table>
        </div>
      )}
    </>
  );
}
