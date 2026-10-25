import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export default async function Leads() {
  const creator = await requireCreator();
  const [leads, total] = await Promise.all([
    db.lead.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "desc" }, take: 200, include: { product: true } }),
    db.lead.count({ where: { creatorId: creator.id } }),
  ]);
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${total} ${total === 1 ? "subscriber" : "subscribers"} from your lead magnets, and from products and links that collect emails`}
        action={
          total > 0 && (
            // A file download, not a page, so a plain link is right here.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/api/leads/export" download className="btn-secondary">Export CSV</a>
          )
        }
      />
      {leads.length === 0 ? (
        <div className="card py-12 text-center text-sm text-neutral-500">No leads yet. Add a lead magnet, or turn on Collect emails on a product or link, to start building your list.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">From</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.email}</td>
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">{l.product.title}</td>
                  <td className="hidden px-4 py-3 text-neutral-500 sm:table-cell">{l.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
