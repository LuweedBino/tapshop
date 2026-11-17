import { followRefLink } from "@/lib/refLink";

export async function GET(_: Request, { params }: { params: Promise<{ code: string; productId: string }> }) {
  const { code, productId } = await params;
  return followRefLink(code, productId);
}
