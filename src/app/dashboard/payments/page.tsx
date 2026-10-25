import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { PageHeader } from "@/components/PageHeader";
import { ConnectStripeButton } from "@/components/ConnectStripeButton";

export const dynamic = "force-dynamic";

export default async function Payments() {
  let creator = await requireCreator();
  // Refresh status from Stripe when returning from onboarding, in case the webhook is slow.
  if (stripeEnabled() && creator.stripeAccountId && !creator.stripeReady) {
    const account = await stripe().accounts.retrieve(creator.stripeAccountId).catch(() => null);
    if (account?.charges_enabled) creator = await db.creator.update({ where: { id: creator.id }, data: { stripeReady: true } });
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Payments" subtitle="TapShop takes 0% of your sales. Stripe's standard processing fees apply." />
      <div className="card">
        {!stripeEnabled() ? (
          <p className="text-sm text-neutral-600">Stripe isn&apos;t configured on this server yet. Set <code>STRIPE_SECRET_KEY</code> to enable payments.</p>
        ) : creator.stripeReady ? (
          <>
            <p className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Stripe connected</p>
            <p className="mt-1 text-sm text-neutral-500">Payouts go straight to your Stripe account. Buyers can pay with card, Apple Pay, or Google Pay.</p>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4">Open Stripe dashboard ↗</a>
          </>
        ) : (
          <>
            <p className="font-semibold">{creator.stripeAccountId ? "Finish setting up Stripe" : "Connect Stripe to start selling"}</p>
            <p className="mt-1 text-sm text-neutral-500">
              You&apos;ll be sent to Stripe to verify your details. It takes a few minutes. Lead magnets and free products work without it.
            </p>
            <ConnectStripeButton label={creator.stripeAccountId ? "Continue setup" : "Connect with Stripe"} />
          </>
        )}
        {env.allowPlatformCharges && !creator.stripeReady && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Test mode: ALLOW_PLATFORM_CHARGES is on, so sales currently go to the platform Stripe account.</p>
        )}
      </div>
    </div>
  );
}
