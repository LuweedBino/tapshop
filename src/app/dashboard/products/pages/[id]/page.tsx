import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/PageHeader";
import { PageForm } from "@/components/PageForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const creator = await requireCreator();
  const page = await db.page.findFirst({ where: { id: (await params).id, creatorId: creator.id } });
  if (!page) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit page" subtitle={page.title} />
      <PageForm page={page} handle={creator.handle} appUrl={env.appUrl} />
    </div>
  );
}
