import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

export default async function Orders() {
  const creator = await requireCreator();
  const orders = await db.order.findMany({
    where: { creatorId: creator.id, status: { in: ["PAID", "REFUNDED"] } },
    orderBy: { paidAt: "desc" },
    take: 200,
    include: { product: true },
  });
  return (
    <>
      <PageHeader title="Orders" subtitle={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`} />
      {orders.length === 0 ? (
        <div className="card py-12 text-center text-sm text-neutral-500">No orders yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.buyerName || o.buyerEmail}</p>
                    {o.buyerName && <p className="text-xs text-neutral-500">{o.buyerEmail}</p>}
                  </td>
                  <td className="px-4 py-3">{o.product.title}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(o.amountCents, o.currency)}
                    {o.status === "REFUNDED" && <span className="ml-1 text-xs text-red-600">refunded</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">{o.paidAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
