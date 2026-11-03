import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteDiscount, setDiscountActive } from "@/app/actions/discounts";
import { discountLabel } from "@/lib/discounts";
import { DeleteButton } from "@/components/DeleteButton";
import { DiscountForm, LocalDate } from "@/components/DiscountForm";
import { PageHeader } from "@/components/PageHeader";

export default async function Discounts() {
  const creator = await requireCreator();
  const [codes, products] = await Promise.all([
    db.discountCode.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { title: true } }, _count: { select: { orders: { where: { status: { in: ["PAID", "REFUNDED"] } } } } } },
    }),
    db.product.findMany({
      where: { creatorId: creator.id, type: "DIGITAL", archived: false, priceCents: { gt: 0 } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader title="Discounts" subtitle="Make codes your buyers can type at checkout." />
      <div className="space-y-6">
        <DiscountForm key={codes.length} products={products} />
        {codes.length === 0 ? (
          <div className="card py-12 text-center text-sm text-neutral-500">No discount codes yet.</div>
        ) : (
          <ul className="space-y-3">
            {codes.map((c) => {
              const used = c._count.orders;
              const ended = c.expiresAt !== null && c.expiresAt <= now;
              const usedUp = c.maxUses !== null && used >= c.maxUses;
              const status = !c.active ? "Off" : ended ? "Ended" : usedUp ? "Used up" : "Active";
              return (
                <li key={c.id} className="card flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono font-bold">{c.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === "Active" ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}>{status}</span>
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">{discountLabel(c)} · {c.product?.title ?? "All products"}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Used {used}{c.maxUses !== null ? ` of ${c.maxUses}` : used === 1 ? " time" : " times"}
                      {c.expiresAt && <> · {ended ? "Ended" : "Last day"} <LocalDate iso={c.expiresAt.toISOString()} /></>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <form action={setDiscountActive.bind(null, c.id, !c.active)}>
                      <button className="text-sm font-medium text-neutral-600 hover:text-neutral-900">{c.active ? "Turn off" : "Turn on"}</button>
                    </form>
                    <DeleteButton action={deleteDiscount.bind(null, c.id)} title={c.code} message={`Delete ${c.code}? Buyers won't be able to use it. Past orders stay as they are.`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
