import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCreator } from "@/lib/auth";
import { keyOwner, MAX_BYTES } from "@/lib/storage";

// Issues Vercel Blob client-upload tokens. The pathname must be a key that /api/upload
// handed this creator, so nobody can write into another creator's files.
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const creator = await getCreator();
        const owner = keyOwner(pathname);
        if (!creator || owner?.creatorId !== creator.id) throw new Error("Forbidden");
        return {
          addRandomSuffix: false,
          maximumSizeInBytes: MAX_BYTES[owner.visibility],
          allowedContentTypes: owner.visibility === "public" ? ["image/*"] : undefined,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
