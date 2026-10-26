import { requireCreator } from "@/lib/auth";
import { StudioFrame } from "@/components/studio/StudioFrame";

export const metadata = { title: "Studio" };

export default async function StudioPage() {
  await requireCreator();
  return <StudioFrame />;
}
