import { nanoid } from "nanoid";
import { db } from "./db";
import { env } from "./env";
import { stripe, stripeEnabled } from "./stripe";
import { affiliateEmail, escape, sendEmail } from "./email";
import { money } from "./format";

// Creator affiliate programs: other TapShopUGC users share /r/<code> links to a creator's store or
// products and earn a cut of the sales they bring in. The cut is taken from each sale as the
// Stripe application fee (so it lands in the platform balance), held for HOLD_DAYS in case of a
// refund, then sent to the affiliate's own connected Stripe account by payCommissions().

export const HOLD_DAYS = 7;
export const MAX_PERCENT = 90;
export const MAX_DAYS = 365;

/** Cookie remembering which affiliate sent a visitor to one creator's store. */
export const refCookie = (creatorId: string) => `ts_ref_${creatorId}`;

export const affiliateLink = (code: string, productId?: string) => `${env.appUrl}/r/${code}${productId ? `/${productId}` : ""}`;
export const joinLink = (handle: string) => `${env.appUrl}/${handle}/affiliates`;

export function newAffiliateCode() {
  return nanoid(10);
}

/** The commission percent a sale of this product earns, or 0 when it's not in the program. */
export function commissionPercent(
  creator: { affiliateOn: boolean; affiliatePercent: number },
  product: { affiliatePercent: number | null },
) {
  if (!creator.affiliateOn) return 0;
  const pct = product.affiliatePercent ?? creator.affiliatePercent;
  return Math.max(0, Math.min(MAX_PERCENT, Math.round(pct)));
}

export function commissionCents(amountCents: number, percent: number) {
  return Math.floor((amountCents * percent) / 100);
}

/**
 * Finds the affiliate whose link this buyer followed, if it still counts for this sale.
 * Affiliates never earn on their own purchases.
 */
export async function affiliateForCheckout(creatorId: string, refValue: string | undefined, buyerEmail: string) {
  if (!refValue) return null;
  const affiliate = await db.affiliate.findFirst({
    where: { id: refValue, creatorId, blockedAt: null },
    include: { member: { select: { email: true } } },
  });
  if (!affiliate || affiliate.member.email === buyerEmail.toLowerCase()) return null;
  return affiliate;
}

/** Called once an order is paid: tells the affiliate about their new commission. */
export async function notifyCommission(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { product: true, creator: true, affiliate: { include: { member: true } } },
  });
  if (!order?.affiliate || order.commissionCents <= 0) return;
  await sendEmail({
    to: order.affiliate.member.email,
    subject: `You earned ${money(order.commissionCents, order.currency)} from a ${order.creator.displayName} sale`,
    html: affiliateEmail({
      name: order.affiliate.member.displayName,
      lines: [
        `Someone bought <strong>${escape(order.product.title)}</strong> through your link.`,
        `Your commission: <strong>${money(order.commissionCents, order.currency)}</strong>. It's sent to your Stripe account ${HOLD_DAYS} days after the sale, once the refund window has passed.`,
      ],
      cta: { label: "See your earnings", url: `${env.appUrl}/dashboard/promote` },
    }),
  });
}

/**
 * A refunded sale earns nothing: cancels a commission that hasn't been sent, or takes back one that has,
 * and gives the creator back the application fee that held it.
 */
export async function cancelCommission(orderId: string, applicationFeeId: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.commissionCents <= 0 || order.commissionStatus === "CANCELED") return;
  if (applicationFeeId && stripeEnabled()) {
    try {
      await stripe().applicationFees.createRefund(applicationFeeId, {}, { idempotencyKey: `commission-fee-refund-${order.id}` });
    } catch (e) {
      // Already refunded along with the charge, or not refundable: nothing else to give back.
      console.error("[affiliates] fee refund skipped", order.id, e instanceof Error ? e.message : e);
    }
  }
  if (order.commissionStatus === "PAID" && order.commissionTransferId && stripeEnabled()) {
    try {
      await stripe().transfers.createReversal(order.commissionTransferId, {}, { idempotencyKey: `commission-reversal-${order.id}` });
    } catch (e) {
      console.error("[affiliates] reversal failed", order.id, e);
      await db.order.update({ where: { id: order.id }, data: { commissionNote: "Refunded, but the payout couldn't be taken back automatically." } });
      return;
    }
  }
  await db.order.update({ where: { id: order.id }, data: { commissionStatus: "CANCELED", commissionNote: "The sale was refunded." } });
}

/**
 * Sends every commission that has waited out the refund window to its affiliate's Stripe account.
 * Safe to run any number of times: each transfer uses the order id as its idempotency key, and a
 * failed one stays HELD with Stripe's reason so the next run tries again.
 */
export async function payCommissions(limit = 50) {
  if (!stripeEnabled()) return { paid: 0, waiting: 0 };
  const due = new Date(Date.now() - HOLD_DAYS * 24 * 3600 * 1000);
  const orders = await db.order.findMany({
    where: { commissionStatus: "HELD", status: "PAID", paidAt: { lte: due }, commissionCents: { gt: 0 } },
    include: { affiliate: { include: { member: true } }, creator: true },
    orderBy: { paidAt: "asc" },
    take: limit,
  });
  let paid = 0;
  let waiting = 0;
  for (const order of orders) {
    const member = order.affiliate?.member;
    if (!order.affiliate || !member) {
      await db.order.update({ where: { id: order.id }, data: { commissionStatus: "CANCELED", commissionNote: "The affiliate's account was removed." } });
      continue;
    }
    if (!member.stripeAccountId) {
      waiting++;
      await db.order.update({ where: { id: order.id }, data: { commissionNote: "Waiting for the affiliate to connect Stripe." } });
      continue;
    }
    try {
      const transfer = await stripe().transfers.create(
        {
          amount: order.commissionCents,
          currency: order.currency,
          destination: member.stripeAccountId,
          transfer_group: order.id,
          description: `TapShopUGC affiliate commission: ${order.creator.displayName}`,
          metadata: { orderId: order.id, affiliateId: order.affiliate.id },
        },
        { idempotencyKey: `commission-${order.id}` },
      );
      await db.order.update({
        where: { id: order.id },
        data: { commissionStatus: "PAID", commissionTransferId: transfer.id, commissionPaidAt: new Date(), commissionNote: "" },
      });
      paid++;
      await sendEmail({
        to: member.email,
        subject: `${money(order.commissionCents, order.currency)} commission sent to your Stripe`,
        html: affiliateEmail({
          name: member.displayName,
          lines: [`Your commission from a ${escape(order.creator.displayName)} sale is on its way to your Stripe account.`],
          cta: { label: "See your earnings", url: `${env.appUrl}/dashboard/promote` },
        }),
      });
    } catch (e) {
      waiting++;
      const reason = e instanceof Error ? e.message : "Stripe couldn't send it";
      console.error("[affiliates] transfer failed", order.id, reason);
      await db.order.update({ where: { id: order.id }, data: { commissionNote: `Not sent yet: ${reason}`.slice(0, 300) } });
    }
  }
  return { paid, waiting };
}

/** Totals per affiliate for the creator's and the affiliate's pages. */
export type AffiliateStats = { sales: number; revenue: number; earned: number; paid: number; held: number };

export function statsOf(orders: { status: string; amountCents: number; commissionCents: number; commissionStatus: string }[]): AffiliateStats {
  const s: AffiliateStats = { sales: 0, revenue: 0, earned: 0, paid: 0, held: 0 };
  for (const o of orders) {
    if (o.status !== "PAID") continue;
    s.sales++;
    s.revenue += o.amountCents;
    if (o.commissionStatus === "CANCELED") continue;
    s.earned += o.commissionCents;
    if (o.commissionStatus === "PAID") s.paid += o.commissionCents;
    if (o.commissionStatus === "HELD") s.held += o.commissionCents;
  }
  return s;
}
