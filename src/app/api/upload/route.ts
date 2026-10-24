import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreator } from "@/lib/auth";
import { MAX_BYTES, newKey, uploadUrl } from "@/lib/storage";

const Body = z.object({
  visibility: z.enum(["public", "private"]),
  filename: z.string().min(1).max(200),
  contentType: z.string().max(200),
  size: z.number().int().positive(),
});

export async function POST(req: Request) {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { visibility, filename, contentType, size } = parsed.data;
  if (size > MAX_BYTES[visibility]) return NextResponse.json({ error: "File is too large" }, { status: 413 });
  if (visibility === "public" && !contentType.startsWith("image/"))
    return NextResponse.json({ error: "Images only" }, { status: 400 });
  const key = newKey(visibility, creator.id, filename);
  return NextResponse.json({ key, url: await uploadUrl(key, contentType || "application/octet-stream") });
}
