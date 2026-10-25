"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { keyOwner } from "@/lib/storage";
import { stripe } from "@/lib/stripe";
import { RESERVED_HANDLES, SOCIALS } from "@/lib/format";
import type { FormState } from "./auth";

/** Accepts a storage key only if it belongs to this creator and has the expected visibility. */
function ownKey(value: FormDataEntryValue | null, creatorId: string, visibility: "public" | "private") {
  const key = typeof value === "string" ? value : "";
  if (!key) return null;
  const owner = keyOwner(key);
  return owner?.creatorId === creatorId && owner.visibility === visibility ? key : undefined;
}

const Profile = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(80),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Handle must be 3 to 30 letters, numbers, or underscores"),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = Profile.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { handle } = parsed.data;
  if (handle !== creator.handle) {
    if (RESERVED_HANDLES.has(handle) || (await db.creator.findUnique({ where: { handle } }))) return { error: "That handle is taken" };
  }
  const avatarKey = ownKey(form.get("avatarKey"), creator.id, "public");
  if (avatarKey === undefined) return { error: "Invalid image" };
  const socialLinks = Object.fromEntries(
    SOCIALS.map((k) => [k, String(form.get(`social_${k}`) ?? "").trim().slice(0, 200)]).filter(([, v]) => v),
  );
  await db.creator.update({ where: { id: creator.id }, data: { ...parsed.data, avatarKey, socialLinks } });
  revalidatePath(`/${creator.handle}`);
  revalidatePath(`/${handle}`);
  return { ok: "Saved" };
}

const ProductInput = z.object({
  type: z.enum(["DIGITAL", "LEAD_MAGNET", "LINK"]),
  title: z.string().trim().min(1, "Give it a title").max(120),
  subtitle: z.string().trim().max(200).default(""),
  description: z.string().trim().max(5000).default(""),
  price: z.string().trim().default("0"),
  ctaLabel: z.string().trim().max(40).default(""),
  url: z.string().trim().max(2000).default(""),
  published: z.string().optional(),
});

export async function saveProduct(productId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = ProductInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const price = d.type === "DIGITAL" ? Number(d.price.replace(/[$,\s]/g, "") || "0") : 0;
  if (!Number.isFinite(price) || price < 0 || price > 100000) return { error: "Enter a valid price" };
  const priceCents = Math.round(price * 100);
  if (priceCents > 0 && priceCents < 50) return { error: "Paid products must cost at least $0.50" };

  let url: string | null = null;
  if (d.type === "LINK") {
    try {
      url = new URL(/^https?:\/\//.test(d.url) ? d.url : `https://${d.url}`).toString();
    } catch {
      return { error: "Enter a valid link" };
    }
  }
  const coverKey = ownKey(form.get("coverKey"), creator.id, "public");
  const fileKey = ownKey(form.get("fileKey"), creator.id, "private");
  if (coverKey === undefined || fileKey === undefined) return { error: "Invalid upload" };
  if (d.type === "DIGITAL" && !fileKey) return { error: "Upload the file buyers will receive" };

  const data = {
    type: d.type,
    title: d.title,
    subtitle: d.subtitle,
    description: d.description,
    priceCents,
    ctaLabel: d.ctaLabel,
    url,
    coverKey: d.type === "LINK" ? null : coverKey,
    fileKey: d.type === "LINK" ? null : fileKey,
    fileName: fileKey ? String(form.get("fileKeyName") ?? "").slice(0, 200) || "download" : null,
    published: d.published === "on",
  };

  if (productId) {
    const res = await db.product.updateMany({ where: { id: productId, creatorId: creator.id, archived: false }, data });
    if (res.count === 0) return { error: "Product not found" };
  } else {
    const last = await db.product.findFirst({ where: { creatorId: creator.id }, orderBy: { position: "desc" } });
    await db.product.create({ data: { ...data, creatorId: creator.id, position: (last?.position ?? -1) + 1 } });
  }
  revalidatePath(`/${creator.handle}`);
  redirect("/dashboard/products");
}

export async function deleteProduct(productId: string) {
  const creator = await requireCreator();
  await db.product.updateMany({ where: { id: productId, creatorId: creator.id }, data: { archived: true, published: false } });
  revalidatePath("/dashboard/products");
  revalidatePath(`/${creator.handle}`);
}

export async function togglePublished(productId: string) {
  const creator = await requireCreator();
  const p = await db.product.findFirst({ where: { id: productId, creatorId: creator.id, archived: false } });
  if (!p) return;
  await db.product.update({ where: { id: p.id }, data: { published: !p.published } });
  revalidatePath("/dashboard/products");
  revalidatePath(`/${creator.handle}`);
}

export async function moveProduct(productId: string, direction: -1 | 1) {
  const creator = await requireCreator();
  const list = await db.product.findMany({ where: { creatorId: creator.id, archived: false }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const i = list.findIndex((p) => p.id === productId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await db.$transaction(list.map((p, position) => db.product.update({ where: { id: p.id }, data: { position } })));
  revalidatePath("/dashboard/products");
  revalidatePath(`/${creator.handle}`);
}

export async function connectStripe(): Promise<FormState> {
  const creator = await requireCreator();
  let url: string;
  try {
    let accountId = creator.stripeAccountId;
    if (!accountId) {
      const account = await stripe().accounts.create({ type: "standard", email: creator.email, metadata: { creatorId: creator.id } });
      accountId = account.id;
      await db.creator.update({ where: { id: creator.id }, data: { stripeAccountId: accountId } });
    }
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${env.appUrl}/dashboard/payments?refresh=1`,
      return_url: `${env.appUrl}/dashboard/payments?return=1`,
    });
    url = link.url;
  } catch (e) {
    console.error("[stripe connect]", e);
    // Shown to the creator only; Stripe's message says what to fix (keys, Connect settings...).
    return { error: `Stripe couldn't start onboarding: ${e instanceof Error ? e.message : "unknown error"}` };
  }
  redirect(url);
}
