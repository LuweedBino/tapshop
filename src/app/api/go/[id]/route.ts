import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseExtras } from "@/lib/affiliate";
import { countClick } from "@/lib/orders";

// Counts a click on an affiliate page, then sends the visitor on. ?b=N picks extra button N.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { creator: { select: { handle: true, pausedAt: true } } } });
  if (!product || product.type !== "AFFILIATE" || !product.published || product.archived || product.creator.pausedAt || !product.url) {
    return new NextResponse("This link is no longer available.", { status: 404 });
  }
  const b = new URL(req.url).searchParams.get("b");
  const target = b === null ? product.url : parseExtras(product.extras).buttons[Number(b)]?.url;
  if (!target) return NextResponse.redirect(new URL(`/${product.creator.handle}/${product.id}`, req.url));
  await countClick(id);
  return NextResponse.redirect(target);
}
