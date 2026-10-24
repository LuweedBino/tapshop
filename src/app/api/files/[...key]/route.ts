import { NextResponse } from "next/server";
import { keyOwner, readLocal, signedDownloadUrl, usingS3 } from "@/lib/storage";

// Serves public images (avatars, product covers). Paid files go through /api/download.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.map(decodeURIComponent).join("/");
  if (keyOwner(key)?.visibility !== "public") return new NextResponse("Not found", { status: 404 });
  if (usingS3()) return NextResponse.redirect(await signedDownloadUrl(key));
  try {
    const { body, contentType } = await readLocal(key);
    return new NextResponse(new Uint8Array(body), {
      headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
