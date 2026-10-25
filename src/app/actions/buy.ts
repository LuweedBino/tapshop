"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { captureLead, CheckoutError, countClick, startCheckout } from "@/lib/orders";

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
    url = await startCheckout(productId, parsed.data);
  } catch (e) {
    console.error(e);
    return { error: e instanceof CheckoutError ? e.message : "Checkout couldn't start. Please try again." };
  }
  redirect(url);
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
