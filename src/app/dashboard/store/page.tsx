import { requireCreator } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";

export default async function StoreSettings() {
  const creator = await requireCreator();
  return (
    <div className="max-w-xl">
      <PageHeader title="Your store" subtitle="How your page looks to followers." />
      <ProfileForm creator={creator} />
    </div>
  );
}
