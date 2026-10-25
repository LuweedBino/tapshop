import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readObject, signedDownloadUrl, usingS3 } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await db.order.findUnique({ where: { downloadToken: token }, include: { product: true } });
  const lead = order ? null : await db.lead.findUnique({ where: { downloadToken: token }, include: { product: true } });
  // A lead token unlocks only a lead magnet's file; a digital product's file needs a paid order.
  const product = order?.status === "PAID" ? order.product : lead?.product.type === "LEAD_MAGNET" ? lead.product : undefined;
  if (!product?.fileKey) return new NextResponse("This download link is not valid.", { status: 404 });

  if (order) await db.order.update({ where: { id: order.id }, data: { downloadCount: { increment: 1 } } });
  else if (lead) await db.lead.update({ where: { id: lead.id }, data: { downloadCount: { increment: 1 } } });

  const name = product.fileName ?? "download";
  if (usingS3()) return NextResponse.redirect(await signedDownloadUrl(product.fileKey, name));
  const file = await readObject(product.fileKey);
  if (!file) return new NextResponse("File not found.", { status: 404 });
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
