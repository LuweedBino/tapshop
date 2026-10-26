import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { KIT_SLUG, parseKit, starterKit } from "@/lib/mediaKit";
import { deleteInquiry } from "@/app/actions/mediaKit";
import { PageHeader } from "@/components/PageHeader";
import { CopyLink } from "@/components/CopyLink";
import { MediaKitBuilder } from "@/components/MediaKitBuilder";

export default async function MediaKitPage() {
  const creator = await requireCreator();
  const [kit, inquiries] = await Promise.all([
    db.mediaKit.findUnique({ where: { creatorId: creator.id } }),
    db.brandInquiry.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const url = `${env.appUrl}/${creator.handle}/${KIT_SLUG}`;
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Media kit"
        subtitle="A portfolio to send brands. Build it from sections, style it your way, and watch the preview as you go."
        action={kit?.published && <a href={url} target="_blank" className="btn-secondary">View ↗</a>}
      />
      <div className="mb-5"><CopyLink url={url} /></div>

      {inquiries.length > 0 && (
        <section className="card mb-5 max-w-3xl p-0">
          <h2 className="border-b border-neutral-200 px-4 py-3 font-semibold">Brand inquiries ({inquiries.length})</h2>
          <ul className="divide-y divide-neutral-100">
            {inquiries.map((q) => (
              <li key={q.id} className="flex gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {q.company || q.name} <span className="font-normal text-neutral-500">· <a href={`mailto:${q.email}`} className="underline-offset-2 hover:underline">{q.email}</a></span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {q.company && `${q.name} · `}
                    {q.budget && `Budget: ${q.budget} · `}
                    {q.createdAt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                  </p>
                  <p className="mt-1.5 whitespace-pre-line">{q.message}</p>
                </div>
                <form action={deleteInquiry.bind(null, q.id)}>
                  <button aria-label="Delete inquiry" className="text-neutral-400 hover:text-red-600">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MediaKitBuilder
        creator={creator}
        initial={{ headline: kit?.headline ?? "", published: kit?.published ?? false, doc: kit ? parseKit(kit.data, kit.about) : starterKit() }}
        updatedAt={kit?.updatedAt ?? new Date()}
      />
    </div>
  );
}
