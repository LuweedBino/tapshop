import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { markPaid } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

// Register this endpoint in Stripe for events on connected accounts
// (checkout.session.completed, checkout.session.async_payment_succeeded, account.updated,
// charge.refunded). Add a second endpoint for your own account if ALLOW_PLATFORM_CHARGES is on.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature || !env.stripeWebhookSecret) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, env.stripeWebhookSecret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId && session.payment_status === "paid") await markPaid(orderId, session);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await db.creator.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeReady: Boolean(account.charges_enabled) },
      });
      break;
    }
    case "charge.refunded": {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId && event.data.object.refunded)
        await db.order.updateMany({ where: { id: orderId }, data: { status: "REFUNDED" } });
      break;
    }
  }
  return NextResponse.json({ received: true });
}
