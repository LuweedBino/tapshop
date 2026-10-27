import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { readObject, signedDownloadUrl, usingS3 } from "@/lib/storage";

// Opens (or with ?download=1 downloads) a Media Vault file. Only its owner can.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCreator();
  if (!creator) return new NextResponse("Not signed in", { status: 401 });
  const { id } = await params;
  const item = await db.vaultItem.findFirst({ where: { id, creatorId: creator.id } });
  if (!item) return new NextResponse("Not found", { status: 404 });
  // Only media and PDFs open in the browser; anything else (HTML, SVG, scripts…) downloads.
  const inlineSafe = /^(image\/(png|jpe?g|gif|webp|avif)|video\/|audio\/|application\/pdf|text\/plain)/.test(item.contentType);
  const download = new URL(req.url).searchParams.has("download") || !inlineSafe;
  const name = item.name.replace(/["\r\n]/g, "");
  // ?raw=1 is the Studio importing the file: always stream it from here (no redirect to S3),
  // so the editor can read it without the bucket allowing cross-origin GETs.
  const raw = new URL(req.url).searchParams.has("raw");
  if (usingS3() && !raw) return NextResponse.redirect(await signedDownloadUrl(item.key, download ? name : undefined));
  const file = await readObject(item.key);
  if (!file) return new NextResponse("File not found", { status: 404 });
  return new NextResponse(file.body, {
    headers: {
      "content-type": item.contentType || file.contentType,
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox",
    },
  });
}
