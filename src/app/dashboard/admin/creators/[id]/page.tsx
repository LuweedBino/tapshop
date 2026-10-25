import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { AccountForm, DeleteForm, PasswordForm, PauseForm, StripeForm } from "@/components/AdminCreatorForms";

export const dynamic = "force-dynamic";

export default async function AdminCreator({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const creator = await db.creator.findUnique({
    where: { id },
    include: { _count: { select: { products: { where: { archived: false } }, leads: true } } },
  });
  if (!creator) notFound();
  const sales = await db.order.groupBy({ by: ["currency"], where: { creatorId: id, status: "PAID" }, _sum: { amountCents: true }, _count: true });
  const stats = [
    ["Products", String(creator._count.products)],
    ["Leads", String(creator._count.leads)],
    ["Sales", String(sales.reduce((n, s) => n + s._count, 0))],
    ["Revenue", sales.map((s) => money(s._sum.amountCents ?? 0, s.currency)).join(" · ") || money(0)],
  ];

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/admin" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">← All creators</Link>
      <div className="mt-3">
        <PageHeader
          title={creator.displayName}
          subtitle={`${creator.email} · joined ${creator.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          action={<Link href={`/${creator.handle}`} target="_blank" className="btn-secondary">View store ↗</Link>}
        />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <AccountForm creator={creator} />
        <PasswordForm creatorId={creator.id} />
        <StripeForm creator={creator} />
        <PauseForm creator={creator} isSelf={creator.id === admin.id} />
        <DeleteForm creator={creator} isSelf={creator.id === admin.id} />
      </div>
    </div>
  );
}
