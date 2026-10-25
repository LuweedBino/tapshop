import { requireCreator } from "@/lib/auth";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/PageHeader";
import { PageForm } from "@/components/PageForm";

export default async function NewPage() {
  const creator = await requireCreator();
  return (
    <div className="max-w-2xl">
      <PageHeader title="New page" subtitle="A separate storefront with its own link. Products you put on it don't show on your main store." />
      <PageForm handle={creator.handle} appUrl={env.appUrl} />
    </div>
  );
}
