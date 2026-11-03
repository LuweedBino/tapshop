import type { DiscountCode, DiscountType, Prisma } from "@prisma/client";
import { money } from "./format";

export const CODE_RE = /^[A-Z0-9_-]{3,30}$/;
// Stripe won't charge less than this.
export const STRIPE_MIN_CENTS = 50;
// Stripe won't close a checkout sooner than 30 minutes.
export const CHECKOUT_MINUTES = 31;
const HOLD_MINUTES = CHECKOUT_MINUTES + 4;

export const normalizeCode = (raw: string) => raw.trim().toUpperCase();

export function discountCents(priceCents: number, d: Pick<DiscountCode, "type" | "value">) {
  const off = d.type === "PERCENT" ? Math.round((priceCents * d.value) / 100) : d.value;
  return Math.min(off, priceCents);
}

export function discountLabel(d: { type: DiscountType; value: number }, currency = "usd") {
  return d.type === "PERCENT" ? `${d.value}% off` : `${money(d.value, currency)} off`;
}

/** Orders that use up a code: finished ones, plus checkouts that could still be paid. */
function usedOrders(discountId: string): Prisma.OrderWhereInput {
  return { discountId, OR: [{ status: { not: "PENDING" } }, { createdAt: { gte: new Date(Date.now() - HOLD_MINUTES * 60_000) } }] };
}

type Reader = Pick<Prisma.TransactionClient, "discountCode" | "order">;

export async function checkCode(client: Reader, product: { id: string; creatorId: string }, raw: string): Promise<{ code: DiscountCode } | { error: string }> {
  const text = normalizeCode(raw);
  const code = CODE_RE.test(text) ? await client.discountCode.findUnique({ where: { creatorId_code: { creatorId: product.creatorId, code: text } } }) : null;
  if (!code || !code.active || (code.productId && code.productId !== product.id)) return { error: "That code isn't valid" };
  if (code.expiresAt && code.expiresAt <= new Date()) return { error: "That code has ended" };
  if (code.maxUses !== null && (await client.order.count({ where: usedOrders(code.id) })) >= code.maxUses) return { error: "That code has been used up" };
  return { code };
}
