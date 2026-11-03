"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { captureLead, CheckoutError, countClick, startCheckout } from "@/lib/orders";
import { db } from "@/lib/db";
import { checkCode, discountCents, STRIPE_MIN_CENTS } from "@/lib/discounts";
import { money } from "@/lib/format";

export type BuyState = { error?: string } | undefined;

const Buyer = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().max(100).default(""),
});

export async function buy(productId: string, _: BuyState, form: FormData): Promise<BuyState> {
  const parsed = Buyer.safeParse({ email: form.get("email"), name: form.get("name") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let url: string;
  try {
    url = await startCheckout(productId, parsed.data, String(form.get("code") ?? "").slice(0, 60));
  } catch (e) {
    console.error(e);
    return { error: e instanceof CheckoutError ? e.message : "Checkout couldn't start. Please try again." };
  }
  redirect(url);
}

export type CodePreview = { error: string } | { code: string; off: string; totalCents: number; total: string };

/** Shows the buyer the new price. startCheckout checks the code again and sets what they really pay. */
export async function previewCode(productId: string, rawCode: string): Promise<CodePreview> {
  const product = await db.product.findUnique({ where: { id: productId }, include: { creator: true } });
  if (!product || !product.published || product.type !== "DIGITAL" || product.priceCents === 0 || product.creator.pausedAt) return { error: "This product is no longer available" };
  const checked = await checkCode(db, product, String(rawCode).slice(0, 60));
  if ("error" in checked) return checked;
  const off = discountCents(product.priceCents, checked.code);
  const totalCents = product.priceCents - off;
  if (totalCents > 0 && totalCents < STRIPE_MIN_CENTS) return { error: `That code brings the price under ${money(STRIPE_MIN_CENTS, product.currency)}, the lowest amount we can charge` };
  return { code: checked.code.code, off: money(off, product.currency), totalCents, total: money(totalCents, product.currency) };
}

export async function optIn(productId: string, _: BuyState, form: FormData): Promise<BuyState> {
  const parsed = Buyer.safeParse({ email: form.get("email"), name: form.get("name") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let next: string;
  try {
    const { lead, product } = await captureLead(productId, parsed.data);
    // Straight to the link: a redirect to /api/go from here would be fetched twice and count two clicks.
    if (product.type === "AFFILIATE") await countClick(product.id);
    next = (product.type === "LINK" || product.type === "AFFILIATE") && product.url ? product.url : `/thanks/lead/${lead.downloadToken}`;
  } catch {
    return { error: "Something went wrong, please try again" };
  }
  redirect(next);
}
