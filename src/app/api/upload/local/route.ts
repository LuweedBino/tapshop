import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { keyOwner, usingS3, writeLocal } from "@/lib/storage";

// Development-only stand-in for an S3 presigned PUT.
export async function PUT(req: Request) {
  if (usingS3()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const creator = await getCreator();
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!creator || keyOwner(key)?.creatorId !== creator.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await writeLocal(key, Buffer.from(await req.arrayBuffer()), req.headers.get("content-type") ?? "application/octet-stream");
  return NextResponse.json({ ok: true });
}
