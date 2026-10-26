# AGENTS.md

Instructions for AI coding agents (Claude, Codex, Cursor, etc.) working in this repo. Humans: see README.md.

## What this is

TapShop: a mobile-first link-in-bio storefront. Creators get a page at `/<handle>`, sell digital products through Stripe Checkout on their own connected account, collect leads, and share a Portfolio with brands.

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Postgres + Prisma 6 · Stripe Connect (direct charges) · Vercel Blob / S3 / local disk storage · Resend email · zod for validation.

## Commands

```bash
npm install              # also runs prisma generate
npm run dev              # http://localhost:3000
npm run lint             # eslint (next/core-web-vitals + next/typescript)
npx tsc --noEmit         # typecheck
npx prisma migrate dev --name <short_snake_name>   # after editing prisma/schema.prisma
```

There is no test suite. Before calling a change done, `npm run lint` and `npx tsc --noEmit` must both pass.

`npm run build` runs `prisma migrate deploy` (via `scripts/migrate.sh`), so it needs a reachable database. Don't run it just to check types.

## Project layout

- `src/app/[handle]/` is the public storefront; `[handle]/[productId]` shows product, page and portfolio views.
- `src/app/dashboard/` is the creator dashboard. `src/middleware.ts` guards it and redirects to `/login` without a session.
- `src/app/actions/` holds server actions (`"use server"`), one file per area.
- `src/app/api/` holds route handlers: Stripe webhook, uploads, file serving, downloads, lead export, link redirects (`go/[id]`).
- `src/components/` is shared UI. Interactive pieces are client components (`"use client"`).
- `src/lib/` is domain logic and helpers: `db.ts` (Prisma singleton), `auth.ts`, `env.ts`, `storage.ts`, `stripe.ts`, `design.ts`, and one file per feature (`avatar`, `banner`, `iconStyle`, `mediaKit`, `pages`, `affiliate`, ...).
- `prisma/schema.prisma` plus `prisma/migrations/` hold the database.

Import with the `@/` alias (`@/lib/db`, `@/components/...`).

## Conventions

- **Server actions** start with `requireCreator()` (or `requireAdmin()`), validate `FormData` with a zod schema, and return `FormState` (`{ error }`) for form errors. Finish with `revalidatePath` / `redirect`. Follow `src/app/actions/pages.ts`.
- **Ownership:** every query on creator data filters by `creatorId: creator.id`. Never trust an id from the client on its own. For uploaded file keys, use `ownKey()` from `src/lib/storage.ts`.
- **Env vars:** read them through `env` in `src/lib/env.ts`, not `process.env` directly. If you add one, also add it to `.env.example` with a comment.
- **JSON style columns** (`avatarStyle`, `socialLinks`, banner and icon styles, portfolio sections) always go through their `parse...()` helper in `src/lib/`, which fills in defaults. Keep the parsers tolerant of old or partial data.
- **Design options:** valid theme, font, button and layout values live in `src/lib/design.ts`. Add new options there, not inline.
- **Migrations:** never edit an existing migration. Add a new one, and give new columns defaults so existing rows keep working.
- **Mobile first:** storefront and dashboard UI must work at phone width before anything else.
- **Images:** plain `<img>` with `// eslint-disable-next-line @next/next/no-img-element` is the existing pattern for user uploads.
- Match the surrounding style: small focused files, named exports, few comments, and the ones that exist explain *why*.

## Naming gotcha: Portfolio = media kit

The feature is called **Portfolio** in the UI, but the code still uses `mediaKit` (`src/lib/mediaKit.ts`, `MediaKitBuilder`, `MediaKitView`, `actions/mediaKit.ts`, the `KIT_SLUG` / `OLD_KIT_SLUG` constants). `/dashboard/media-kit` permanently redirects to `/dashboard/portfolio`. Use "Portfolio" in anything users see. Don't rename the code unless asked.

## Payments and files (be careful here)

- Paid orders are marked paid both on the thank-you page and in the Stripe webhook. That path must stay **idempotent**, and the delivery email goes out exactly once.
- Paid files are private. They are only served through `/api/download/<token>` after the order is checked. Never give a paid file a public URL.
- Charges are direct charges on the creator's connected account. `ALLOW_PLATFORM_CHARGES` is for local testing only.

## Git and PRs

- Work on a branch and open a PR into `main`; don't push to `main` directly.
- Commit messages are short, plain English and describe what the user gets, e.g. "Let the portfolio video section hold several videos".
- Never commit `.env*` files (except `.env.example`), `/storage`, or secrets.

## Roadmap (from README)

Courses, calendar bookings, memberships, Instagram AutoDM, and Pro features (email flows, upsells and order bumps, payment plans, discount codes, affiliates).
