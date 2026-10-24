import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { money } from "@/lib/format";
import { canSell } from "@/lib/orders";
import { CopyLink } from "@/components/CopyLink";
import { PageHeader } from "@/components/PageHeader";

export default async function DashboardHome() {
  const creator = await requireCreator();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [revenue, orders, leads, products, recent] = await Promise.all([
    db.order.aggregate({ where: { creatorId: creator.id, status: "PAID", paidAt: { gte: since } }, _sum: { amountCents: true } }),
    db.order.count({ where: { creatorId: creator.id, status: "PAID", paidAt: { gte: since } } }),
    db.lead.count({ where: { creatorId: creator.id, createdAt: { gte: since } } }),
    db.product.count({ where: { creatorId: creator.id, archived: false } }),
    db.order.findMany({ where: { creatorId: creator.id, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 5, include: { product: true } }),
  ]);

  const steps = [
    { done: Boolean(creator.bio || creator.avatarKey), label: "Add a photo and bio", href: "/dashboard/store" },
    { done: products > 0, label: "Add your first product", href: "/dashboard/products/new" },
    { done: canSell(creator), label: "Connect Stripe to get paid", href: "/dashboard/payments" },
  ];

  return (
    <>
      <PageHeader title={`Hey ${creator.displayName.split(" ")[0]} 👋`} subtitle="Here's how your store did in the last 30 days." />
      <div className="card mb-6">
        <p className="label">Your store link. Put it in your bio.</p>
        <CopyLink url={`${env.appUrl}/${creator.handle}`} />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["Revenue", money(revenue._sum.amountCents ?? 0)],
          ["Sales", String(orders)],
          ["New leads", String(leads)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums md:text-2xl">{value}</p>
          </div>
        ))}
      </div>
      {steps.some((s) => !s.done) && (
        <div className="card mb-6">
          <h2 className="font-semibold">Get set up</h2>
          <ul className="mt-3 space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${s.done ? "bg-green-600 text-white" : "border border-neutral-300"}`}>{s.done ? "✓" : ""}</span>
                  <span className={s.done ? "text-neutral-400 line-through" : "font-medium"}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h2 className="font-semibold">Latest sales</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No sales yet. Share your link to get the first one.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {recent.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate"><span className="font-medium">{o.buyerEmail}</span> bought {o.product.title}</span>
                <span className="font-semibold tabular-nums">{money(o.amountCents, o.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
