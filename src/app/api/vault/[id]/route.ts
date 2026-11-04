import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteVaultItem, renameVaultItem } from "@/app/actions/vault";
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
  const range = req.headers.get("range");
  const file = await readObject(item.key, range && /^bytes=(\d+-\d*|-\d+)$/.test(range) ? range : undefined);
  if (!file) return new NextResponse("File not found", { status: 404 });
  return new NextResponse(file.body, {
    status: file.contentRange ? 206 : 200,
    headers: {
      "accept-ranges": "bytes",
      ...(file.size ? { "content-length": String(file.size) } : {}),
      ...(file.contentRange ? { "content-range": file.contentRange } : {}),
      "content-type": item.contentType || file.contentType,
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox",
    },
  });
}

// The Studio's Projects page runs in the editor's iframe, so it can't call server actions.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = await renameVaultItem(id, String(body?.name ?? ""));
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const result = await deleteVaultItem(id);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
