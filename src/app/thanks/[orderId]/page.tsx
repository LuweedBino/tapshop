import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { confirmSession } from "@/lib/orders";
import { ThanksCard } from "@/components/ThanksCard";
import { Refresh } from "@/components/Refresh";

export const dynamic = "force-dynamic";

export default async function OrderThanks({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { orderId } = await params;
  const { session_id } = await searchParams;
  // Don't wait on the webhook: confirm with Stripe directly so the buyer gets their file now.
  if (session_id) await confirmSession(orderId, session_id).catch((e) => console.error(e));

  const order = await db.order.findUnique({ where: { id: orderId }, include: { product: true, creator: true } });
  if (!order) notFound();
  // Only someone holding the Checkout Session id (the buyer) sees the download link here;
  // everyone else is told to check their email.
  const isBuyer = order.amountCents === 0 || (session_id !== undefined && session_id === order.stripeSessionId);

  if (order.status !== "PAID") {
    return (
      <ThanksCard creator={order.creator} title="Finishing up your payment…" body="This usually takes a few seconds.">
        <Refresh seconds={3} />
      </ThanksCard>
    );
  }
  return (
    <ThanksCard
      creator={order.creator}
      title="You're all set!"
      body={`Thanks for getting ${order.product.title}. We also sent a download link to ${order.buyerEmail}.`}
      download={isBuyer && order.product.fileKey ? `/api/download/${order.downloadToken}` : undefined}
    />
  );
}
