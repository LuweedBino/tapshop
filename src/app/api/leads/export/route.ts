import { NextResponse } from "next/server";
import { getCreator } from "@/lib/auth";
import { db } from "@/lib/db";

function cell(v: string) {
  // Quote every cell and neutralise spreadsheet formulas.
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const creator = await getCreator();
  if (!creator) return new NextResponse("Unauthorized", { status: 401 });
  const leads = await db.lead.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: "asc" }, include: { product: true } });
  const rows = [["email", "name", "lead_magnet", "signed_up_at"], ...leads.map((l) => [l.email, l.name, l.product.title, l.createdAt.toISOString()])];
  return new NextResponse(rows.map((r) => r.map(cell).join(",")).join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${creator.handle}-leads.csv"` },
  });
}
