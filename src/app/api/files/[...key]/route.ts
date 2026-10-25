import { NextResponse } from "next/server";
import { keyOwner, readObject, signedDownloadUrl, usingS3 } from "@/lib/storage";

// Serves public images (avatars, product covers). Paid files go through /api/download.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.map(decodeURIComponent).join("/");
  if (keyOwner(key)?.visibility !== "public") return new NextResponse("Not found", { status: 404 });
  if (usingS3()) return NextResponse.redirect(await signedDownloadUrl(key));
  const file = await readObject(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(file.body, {
    headers: { "content-type": file.contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
}
