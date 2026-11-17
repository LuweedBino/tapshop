import { NextResponse } from "next/server";
import { db } from "./db";
import { env } from "./env";
import { refCookie } from "./affiliates";

/** Follows an affiliate link: remembers the affiliate for this creator's store, counts the click, then opens the store or product. */
export async function followRefLink(code: string, productId?: string) {
  const affiliate = await db.affiliate.findUnique({ where: { code }, include: { creator: true } });
  if (!affiliate) return NextResponse.redirect(env.appUrl);
  const { creator } = affiliate;
  let to = `${env.appUrl}/${creator.handle}`;
  if (productId) {
    const product = await db.product.findFirst({ where: { id: productId, creatorId: creator.id, published: true, archived: false }, select: { id: true } });
    if (product) to += `/${product.id}`;
  }
  const res = NextResponse.redirect(to);
  if (!affiliate.blockedAt && creator.affiliateOn) {
    await db.affiliate.update({ where: { id: affiliate.id }, data: { clicks: { increment: 1 } } });
    res.cookies.set(refCookie(creator.id), affiliate.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, creator.affiliateDays) * 24 * 3600,
    });
  }
  return res;
}
