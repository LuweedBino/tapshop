import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parsePageDesign } from "@/lib/pageDesign";
import { PageHeader } from "@/components/PageHeader";
import { PageBuilder } from "@/components/PageBuilder";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const creator = await requireCreator();
  const page = await db.page.findFirst({
    where: { id: (await params).id, creatorId: creator.id },
    include: { products: { where: { published: true, archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
  });
  if (!page) notFound();
  const { products, ...rest } = page;
  // Only what the page shows goes to the browser (never the password hash or Stripe ids).
  const c = creator;
  const shown = {
    handle: c.handle, avatarKey: c.avatarKey, avatarStyle: c.avatarStyle, bannerKey: c.bannerKey, bannerStyle: c.bannerStyle, displayName: c.displayName,
    accentColor: c.accentColor, bio: c.bio, socialLinks: c.socialLinks, socialStyle: c.socialStyle, socialIconStyle: c.socialIconStyle,
    theme: c.theme, font: c.font, buttonStyle: c.buttonStyle, layout: c.layout,
  };
  return (
    <div>
      <PageHeader
        title="Page builder"
        subtitle={`Design “${page.title}” any way you like. Changes show in the preview right away; tap Save page to publish them.`}
        action={<Link href={`/dashboard/products?page=${page.id}`} className="btn-secondary">Products on this page</Link>}
      />
      <PageBuilder page={rest} initial={parsePageDesign(page.design, creator)} creator={shown} products={products} appUrl={env.appUrl} />
    </div>
  );
}
