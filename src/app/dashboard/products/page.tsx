import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteProduct, moveProduct, togglePublished } from "@/app/actions/dashboard";
import { PageHeader } from "@/components/PageHeader";
import { priceLabel } from "@/components/Storefront";
import { DeleteButton } from "@/components/DeleteButton";
import { CopyLink } from "@/components/CopyLink";
import { env } from "@/lib/env";

const TYPE_LABEL = { DIGITAL: "Digital product", LEAD_MAGNET: "Lead magnet", LINK: "Link", AFFILIATE: "Affiliate link" } as const;

export default async function Products({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const creator = await requireCreator();
  const { page: pageParam } = await searchParams;
  const pages = await db.page.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "asc" } });
  // null is the main store.
  const page = pages.find((p) => p.id === pageParam) ?? null;
  const addHref = page ? `/dashboard/products/new?page=${page.id}` : "/dashboard/products/new";
  const products = await db.product.findMany({
    where: { creatorId: creator.id, archived: false, pageId: page?.id ?? null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { orders: { where: { status: "PAID" } }, leads: true } } },
  });
  return (
    <>
      <PageHeader title="Products" subtitle="Your main store, plus any extra pages. Each page has its own link and shows only its own products." action={<Link href={addHref} className="btn">+ Add</Link>} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Pages">
        {[{ id: null, title: "Main store" }, ...pages].map((p) => (
          <Link
            key={p.id ?? "main"}
            href={p.id ? `/dashboard/products?page=${p.id}` : "/dashboard/products"}
            aria-current={p.id === (page?.id ?? null) ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${p.id === (page?.id ?? null) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:border-neutral-500"}`}
          >
            {p.title}
          </Link>
        ))}
        <Link href="/dashboard/products/pages/new" className="rounded-full border border-dashed border-neutral-400 px-3.5 py-1.5 text-sm font-semibold text-neutral-600 hover:border-neutral-700 hover:text-neutral-900">+ New page</Link>
      </nav>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><CopyLink url={`${env.appUrl}/${creator.handle}${page ? `/${page.slug}` : ""}`} /></div>
        {page && <Link href={`/dashboard/products/pages/${page.id}`} className="btn-secondary shrink-0">Edit page</Link>}
      </div>
      {products.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-semibold">{page ? "This page is empty" : "Your store is empty"}</p>
          <p className="mt-1 text-sm text-neutral-500">Add a digital product or a free lead magnet to get started.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={addHref} className="btn">Sell a product</Link>
            <Link href={`${addHref}${page ? "&" : "?"}type=LEAD_MAGNET`} className="btn-secondary">Add a lead magnet</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((p, i) => (
            <li key={p.id} className="card flex items-center gap-3 p-4">
              <div className="flex flex-col">
                <form action={moveProduct.bind(null, p.id, -1)}>
                  <button disabled={i === 0} aria-label="Move up" className="px-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20">▲</button>
                </form>
                <form action={moveProduct.bind(null, p.id, 1)}>
                  <button disabled={i === products.length - 1} aria-label="Move down" className="px-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20">▼</button>
                </form>
              </div>
              <Link href={`/dashboard/products/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {TYPE_LABEL[p.type]}
                  {priceLabel(p) && p.type !== "LINK" && <> · {priceLabel(p)}</>}
                  {p.type === "AFFILIATE" && <> · {p.clicks} {p.clicks === 1 ? "click" : "clicks"}</>}
                  {p.type === "DIGITAL" && <> · {p._count.orders} sold</>}
                  {(p.type === "LEAD_MAGNET" || p.collectEmails) && <> · {p._count.leads} leads</>}
                </p>
              </Link>
              <form action={togglePublished.bind(null, p.id)}>
                <button className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.published ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}>
                  {p.published ? "Live" : "Hidden"}
                </button>
              </form>
              <DeleteButton action={deleteProduct.bind(null, p.id)} title={p.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
