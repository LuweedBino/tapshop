import { followRefLink } from "@/lib/refLink";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return followRefLink(code);
}
