import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { payCommissions } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

// Run daily by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer token.
export async function GET(req: Request) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json(await payCommissions());
}
