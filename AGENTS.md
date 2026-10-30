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

## Studio (design studio + video editor)

- `/dashboard/studio` embeds a static HTML/JS editor in an iframe. Its files live in `vendor/tapshop-studio/` and are served only to signed-in creators by `src/app/dashboard/studio/assets/[...path]/route.ts` (allowlisted file names). Never move them into `public/`.
- It's classic-script code: keep the script order in `video.html` (text-catalog → studio-catalog → video → panel-layout → timeline-strips → color-picker → vault-picker) and don't convert it to modules. `vendor/**` is excluded from ESLint.
- The asset route scopes the editor's `localStorage` keys per creator; don't bypass it.
- The editor talks to the dashboard only through `postMessage`, version 1: `tapshop:export-ready` (PNG → Save to TapShop), `tapshop:open-vault`, `tapshop:vault-save` (`items: [{blob, name, source}]`), editor → dashboard `tapshop:studio-ready` (`page: design|video`, sent once the page's scripts have run) and `tapshop:designs` (`items: [{id, name, w, h, thumb}]`, thumb an SVG data URL or null), and `tapshop:edit-video` (`item: {id, name}`, a design video's "Open in Video Editor"), and dashboard → editor `tapshop:vault-export-all`, `tapshop:list-designs` and `tapshop:vault-import` (`item: {id, name, kind, contentType}`, optional `target: {design: 'new' | <id>}` on the design page; the editor fetches the file itself by id). "Use in Studio" (`UseInStudio.tsx`) asks where a file goes; `StudioFrame.sendTo()` opens the other Studio page first when needed. Design elements of `type: 'video'` keep only a Vault id plus a poster frame: they play on the canvas (`foreignObject`, the same `<video>` is reused across redraws by its `vid`) and use the poster in thumbnails and exports. Catalog shapes are `type: 'shape'` elements (`shape` = an id in `SHAPES` in `index.html`, a path in a 100×100 box scaled to the element, optional `stroke` (border on/off), `outline` (width), `outlineColor`, `noFill`, `opacity`, and text: `text`, `font`, `textBold`, `textColor`, `textSize` (0 = fit to the shape's `TEXT_BOX` area)); rectangle and circle keep their old `rect`/`circle` types but get the same options. Shapes render as `<g data-i>` holding the shape and its text. Text elements also render as `<g data-i>` and take optional `align` (left/center/right/justify), `italic`, `underline`, `lineH`, `letter`, box `boxFill`/`boxOpacity`/`borderStyle` (`TX_BORDERS`)/`borderW`/`borderColor`/`pad`/`radius`, `effect` (`TX_EFFECTS`)/`fxColor`/`fxStr`, and `anim` (`TX_ANIMS`)/`animDur`/`animDelay`/`animLoop`; animations only play on the canvas (CSS classes added while drawing live), never in exports. `studio-catalog.js` holds the shapes (`STUDIO_SHAPES`), shape text areas, emoji stickers and word stickers used by both editors (index.html aliases them as `SHAPES`, `STICKERS`, …). In the video editor, shape tracks accept `shape: 'cat:<id>'` (catalog shape) or `'emoji:<char>'` (sticker) and the optional `borderOn`/`borderW`/`borderColor`/`lineStyle`, `opacity`, text inside (`inner`, `innerColor`, `innerFont`, `innerBold`, `innerItalic`, `innerAlign`, `innerSize`), `stickerEdge`; Dragging a text/shape track snaps to the frame's centre, thirds and edges and to other visible tracks (faint grid + pink guide, drawn only while not exporting; toggle `tapshop-video-snap`), and each track has ⇤ ↔ ⇥ ⤒ ↕ ⤓ position buttons (`vePlace`); text tracks accept `align`, `italic`, `underline`, `lineH`, `letter`, `opacity` and a box (`boxColor`, `boxOpacity`, `boxBorder`, `boxBorderW`, `boxBorderColor`, `boxPad`, `boxRadius`). Stickers are `type: 'sticker'` (`emoji`, `name`, optional `tilt`, `flip`, `opacity`; `STICKER_SETS` in `index.html`); word stickers are ready-made `shape` elements (`WORD_STICKERS`). Shapes, stickers and pictures can also take `effect` (`SHAPE_FX`, an SVG filter)/`fxColor`/`fxStr` and the same `anim` settings as text (the element's markup is wrapped in a `<g data-i>` carrying the animation class and filter); shape text adds `textAlign`/`textItalic`/`textUnderline`/`textLineH`/`textLetter`, and shape borders `lineStyle`. Any element can be `hidden` (drawn as an empty `<g display=none>`, so also left out of exports) or `locked` (`pointer-events=none` + `data-locked`, taps pass through; still selectable from the ☰ Layers panel, which lists elements front-most first and reorders `design.els` by drag). The canvas background takes optional `bgOpacity` (0–1, missing = solid; PNG/SVG keep the see-through part, the editor shows a checkerboard) and `bgGrad` (`{to, angle}`, a two-colour linear gradient from `bg`; CSS-style angle, `bgRect()` draws it). Every `<input type="color">` in both editors opens `color-picker.js` instead of the browser picker (click intercepted; it writes back through the input's own `input`/`change` events); its Transparency slider drives the colour's existing see-through range (`ALPHA_RULES`), and one opening counts as one undo step (`window.cpkSession`); saved brand colours live in `tapshop-brand-colors` (shared by both editors). Text, shapes, rectangles and circles take optional `fillGrad` (`{to, angle}`, fades from `fill`; a `markup()` wrapper swaps the main fill for a per-item `linearGradient`). Video editor text and shape tracks take optional `gradTo`/`gradAngle` (a `paintStyledText()` wrapper swaps `color` for a canvas gradient sized to each line or shape). **★ Brand kit** (design studio) keeps brand colours, `tapshop-brand-fonts` (`{heading, body}`) and `tapshop-brand-logo` (`{src, w, h}`, a PNG data URL shrunk to 600 px) in localStorage. Template and project cards with animated items play on hover (computers) or while on screen (touch, IntersectionObserver), using `liveSvg()`. Dragging on empty canvas draws a box that selects everything it touches (swipe to select, feeds `multiSel`). Templates with `animated: true` (category `Animated`, `ANIMATED_TEMPLATES`, built with the `TPL` helpers; text `_cx` = centre x) are ready-made posts and stories whose items all animate. **Select several** (`#multiBtn`, or Shift+click) keeps a temporary `multiSel` list that `groupMembers()` returns, so its items move, resize, line up (`multiAlign`) and delete together without a `group` id; it isn't saved. Elements sharing a `group` id move, resize (proportionally, from the group box) and use the position buttons together; `boxOf()` returns the group box for members. **Video ↓** (`runVideoExport`) records the design in real time with MediaRecorder (MP4 where supported, else WebM): still runs are pre-rendered once, animated text is drawn each frame from its paused Web Animations state (`currentTime`), videos are drawn from the live canvas `<video>`s (with sound when unmuted). Moving an element snaps to canvas centre/thirds/edges and other elements (`snapMove`, toggle saved as `forma-snap`). Video settings (`paused`, `muted`, `loop`, `speed`, `start`/`end`, `fit`, `radius`, `border`/`borderColor`, `opacity`, `lock`/`ar`) all default to the old behaviour when missing. `StudioFrame` checks `event.origin` and `event.source`; validate any new message the same way.
- **Media Vault**: `VaultItem` rows point at private storage keys. Files are served only to their owner by `src/app/api/vault/[id]/route.ts` (non-media types always download, `CSP: sandbox`). Uploads reuse `uploadFile(…, "private")` and `addVaultItems` checks `ownKey`. Each creator gets `VAULT_QUOTA_BYTES` (`lib/vault.ts`) in total: `saveToVault` checks before uploading and `addVaultItems` enforces it (deleting the just-uploaded objects when over). Folders (`VaultFolder`) are one level deep; `VaultItem.folderId` is optional, and deleting a folder keeps its files (`SetNull`). Folder ids from the client go through `ownFolder()` in `actions/vault.ts`. Inside the editor, `vault-picker.js` lists items via `GET /api/vault` and downloads them with `/api/vault/<id>?raw=1` (streams instead of redirecting to S3, so the fetch stays same-origin).
- Font licences and original font files are kept in `vendor/tapshop-studio-licenses/`.

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
