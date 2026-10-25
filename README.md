# TapShop

A mobile-first link-in-bio storefront for creators. Followers tap the link in a creator's bio, pick a product, pay with Stripe (card, Apple Pay, Google Pay), and get their download instantly. Creators keep 100% of sales: payments go straight to their own Stripe account.

## What's in the MVP

- **Storefront** at `/<handle>`: avatar, bio, social links, accent color, and a list of product cards.
- **Digital products**: paid or free downloads. Paid products use Stripe Checkout on the creator's connected account. After payment the buyer gets a download button on the thank-you page and a download link by email.
- **Lead magnets**: a free opt-in form (name + email) that delivers an optional freebie file and saves the lead.
- **Links**: plain link buttons, like a classic link-in-bio.
- **Creator dashboard**: profile editor, products (add, edit, reorder, hide, remove), orders, leads with CSV export, 30-day stats, and Stripe Connect onboarding.

Later phases: courses, calendar bookings, memberships, Instagram AutoDM, and Pro features (email flows, upsells and order bumps, payment plans, discount codes, affiliates).

## Stack

Next.js 15 (App Router, server actions) · TypeScript · Tailwind CSS 4 · Postgres + Prisma · Stripe Checkout + Connect (Accounts v2 with the full Stripe Dashboard, direct charges) · S3-compatible storage · Resend.

## Running locally

```bash
cp .env.example .env        # fill in DATABASE_URL and AUTH_SECRET at minimum
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000, create a store, and add products. Without Stripe keys, free products and lead magnets work end to end; paid products show as unavailable.

To test paid checkout locally, set Stripe test keys and forward webhooks:

```bash
stripe listen --forward-connect-to localhost:3000/api/stripe/webhook --forward-to localhost:3000/api/stripe/webhook
```

Put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`. Either connect a test Stripe account from **Dashboard → Payments**, or set `ALLOW_PLATFORM_CHARGES=true` to charge on the platform account.

## Deploying (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js, no changes needed).
2. In the project's **Storage** tab, add **Neon** (Postgres) and a **Blob** store with **private** access. Vercel sets `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `BLOB_READ_WRITE_TOKEN` for you. `npm run build` applies migrations over the direct (unpooled) connection.
3. Add `AUTH_SECRET`, `STRIPE_SECRET_KEY`, and later `STRIPE_WEBHOOK_SECRET` under **Settings → Environment Variables**, then redeploy. `APP_URL` defaults to the project's production domain.
4. In Stripe, enable Connect and add a webhook destination at `https://<your-domain>/api/stripe/webhook` for events from **connected accounts**: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated`, `charge.refunded`. If you also use `ALLOW_PLATFORM_CHARGES`, add a second destination for **your account** and put both signing secrets in `STRIPE_WEBHOOK_SECRET`, comma-separated.

S3 or Cloudflare R2 also work instead of Blob: set the `S3_*` variables and allow `PUT` from your domain in the bucket's CORS settings, since browsers upload straight to the bucket.

## How payments and delivery work

1. The buyer submits name and email; the server creates a `PENDING` order and a Checkout Session on the creator's Stripe account.
2. Stripe redirects to `/thanks/<orderId>?session_id=...`. The page verifies the session with Stripe and marks the order paid, so the buyer isn't kept waiting on the webhook. The webhook does the same thing; marking paid is idempotent and the delivery email is sent once.
3. Downloads go through `/api/download/<token>`, which checks the order is paid and serves the file (a short-lived signed URL when S3 is used). Paid files are never publicly reachable.
