import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// The signed-in creator's Media Vault, for the Studio's "From Vault" pickers.
export async function GET() {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [items, folders] = await Promise.all([
    db.vaultItem.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, name: true, kind: true, size: true, contentType: true, folderId: true },
    }),
    db.vaultFolder.findMany({ where: { creatorId: creator.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ items, folders }, { headers: { "cache-control": "private, no-store" } });
}
