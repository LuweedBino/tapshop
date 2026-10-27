import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { db } from "@/lib/db";

// The signed-in creator's Media Vault, for the Studio's "From Vault" pickers.
export async function GET() {
  const creator = await getCreator();
  if (!creator) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const items = await db.vaultItem.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, name: true, kind: true, size: true, contentType: true },
  });
  return NextResponse.json({ items }, { headers: { "cache-control": "private, no-store" } });
}
