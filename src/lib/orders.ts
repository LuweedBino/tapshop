import type Stripe from "stripe";
import { nanoid } from "nanoid";
import { db } from "./db";
import { env } from "./env";
import { stripe, stripeEnabled } from "./stripe";
import { deliveryEmail, sendEmail } from "./email";

/** An error whose message is safe to show the buyer. */
export class CheckoutError extends Error {}

export const downloadLink = (token: string) => `${env.appUrl}/api/download/${token}`;

export function canSell(creator: { stripeAccountId: string | null; stripeReady: boolean }) {
  return stripeEnabled() && (Boolean(creator.stripeAccountId && creator.stripeReady) || env.allowPlatformCharges);
}

// Charges are created directly on the creator's connected Stripe account, so the money and
// the Stripe fees are theirs and the platform takes nothing.
function stripeAccountFor(creator: { stripeAccountId: string | null; stripeReady: boolean }) {
  return creator.stripeAccountId && creator.stripeReady ? { stripeAccount: creator.stripeAccountId } : undefined;
}

export async function startCheckout(productId: string, buyer: { email: string; name: string }) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { creator: true } });
  if (!product || !product.published || product.type !== "DIGITAL") throw new CheckoutError("This product is no longer available");
  if (product.creator.pausedAt) throw new CheckoutError("This store isn't available right now");
  if (product.priceCents > 0 && !canSell(product.creator)) throw new CheckoutError("This creator is not accepting payments yet");

  const order = await db.order.create({
    data: {
      creatorId: product.creatorId,
      productId: product.id,
      buyerEmail: buyer.email,
      buyerName: buyer.name,
      amountCents: product.priceCents,
      currency: product.currency,
      downloadToken: nanoid(32),
    },
  });

  if (product.priceCents === 0) {
    await markPaid(order.id, null);
    return `${env.appUrl}/thanks/${order.id}`;
  }

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: buyer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.priceCents,
            product_data: { name: product.title, description: product.subtitle || undefined },
          },
        },
      ],
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${env.appUrl}/thanks/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/${product.creator.handle}/${product.id}`,
    },
    stripeAccountFor(product.creator),
  );
  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return session.url!;
}

/** Idempotent: safe to call from both the webhook and the thank-you page. */
export async function markPaid(orderId: string, session: Stripe.Checkout.Session | null) {
  const updated = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt: new Date(),
      ...(session?.amount_total != null ? { amountCents: session.amount_total } : {}),
    },
  });
  if (updated.count === 0) return;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { product: true, creator: true } });
  await sendEmail({
    to: order.buyerEmail,
    subject: `Your ${order.product.title}`,
    html: deliveryEmail({
      buyerName: order.buyerName,
      productTitle: order.product.title,
      creatorName: order.creator.displayName,
      link: downloadLink(order.downloadToken),
    }),
  });
  await db.order.update({ where: { id: orderId }, data: { emailSentAt: new Date() } });
}

/** Confirms a Checkout Session with Stripe before trusting it. */
export async function confirmSession(orderId: string, sessionId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { creator: true } });
  if (!order || order.stripeSessionId !== sessionId) return;
  if (order.status !== "PENDING") return;
  const session = await stripe().checkout.sessions.retrieve(sessionId, stripeAccountFor(order.creator));
  if (session.payment_status === "paid" && session.metadata?.orderId === orderId) await markPaid(orderId, session);
}

export async function captureLead(productId: string, lead: { email: string; name: string }) {
  const product = await db.product.findUnique({ where: { id: productId }, include: { creator: true } });
  if (!product || !product.published || product.type !== "LEAD_MAGNET" || product.creator.pausedAt) throw new Error("Not available");
  const row = await db.lead.upsert({
    where: { productId_email: { productId, email: lead.email } },
    update: { name: lead.name || undefined },
    create: { creatorId: product.creatorId, productId, email: lead.email, name: lead.name, downloadToken: nanoid(32) },
  });
  if (product.fileKey) {
    await sendEmail({
      to: row.email,
      subject: `Here's your ${product.title}`,
      html: deliveryEmail({
        buyerName: row.name,
        productTitle: product.title,
        creatorName: product.creator.displayName,
        link: downloadLink(row.downloadToken),
      }),
    });
  }
  return row;
}
