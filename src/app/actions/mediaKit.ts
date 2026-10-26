"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { inquiryEmail, sendEmail } from "@/lib/email";
import { normalizeUrl } from "@/lib/affiliate";
import { isSocialKind } from "@/lib/socials";
import { ownKey } from "@/lib/storage";
import { KIT_SLUG, LIMITS, parseCount, type KitData, type KitShare } from "@/lib/mediaKit";
import type { FormState } from "./auth";

const text = (form: FormData, name: string, max: number) => form.getAll(name).map((v) => String(v).trim().slice(0, max));
const pct = (v: string) => {
  const n = Number(v.replace("%", "").trim() || "0");
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

function shares(form: FormData, prefix: string, max: number): KitShare[] | string {
  const labels = text(form, `${prefix}_label`, 40);
  const pcts = text(form, `${prefix}_pct`, 6);
  const out: KitShare[] = [];
  for (let i = 0; i < Math.min(labels.length, max); i++) {
    if (!labels[i]) continue;
    const p = pct(pcts[i] ?? "");
    if (p === null) return `Use a percent from 0 to 100 for "${labels[i]}"`;
    out.push({ label: labels[i], pct: p });
  }
  return out;
}

export async function saveMediaKit(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();

  const kinds = form.getAll("stat_kind").map(String);
  const handles = text(form, "stat_handle", 60);
  const followers = text(form, "stat_followers", 20);
  const views = text(form, "stat_views", 20);
  const engagement = text(form, "stat_engagement", 6);
  const stats: KitData["stats"] = [];
  for (let i = 0; i < Math.min(kinds.length, LIMITS.stats); i++) {
    const kind = kinds[i];
    if (!isSocialKind(kind)) continue;
    const f = parseCount(followers[i] ?? "");
    if (f === null) return { error: "Enter follower counts like 12,300 or 12.3K" };
    const v = views[i] ? parseCount(views[i]) : null;
    if (views[i] && v === null) return { error: "Enter average views like 4,500 or 4.5K" };
    const e = engagement[i] ? pct(engagement[i]) : null;
    if (engagement[i] && e === null) return { error: "Use a percent from 0 to 100 for engagement" };
    stats.push({ kind, handle: handles[i] ?? "", followers: f, avgViews: v, engagement: e });
  }

  const ages = shares(form, "age", LIMITS.ages);
  if (typeof ages === "string") return { error: ages };
  const locations = shares(form, "loc", LIMITS.locations);
  if (typeof locations === "string") return { error: locations };
  const [women, men, other] = ["gender_women", "gender_men", "gender_other"].map((n) => String(form.get(n) ?? "").trim());
  let gender: KitData["gender"] = null;
  if (women || men || other) {
    const g = [women, men, other].map((v) => pct(v));
    if (g.some((v) => v === null)) return { error: "Use percents from 0 to 100 for audience gender" };
    gender = { women: g[0]!, men: g[1]!, other: g[2]! };
  }

  const brands = text(form, "partner_brand", 60);
  const logos = form.getAll("partner_logo");
  const descriptions = text(form, "partner_desc", 300);
  const urls = text(form, "partner_url", 500);
  const partnerships: KitData["partnerships"] = [];
  for (let i = 0; i < Math.min(brands.length, LIMITS.partnerships); i++) {
    if (!brands[i]) continue;
    const logoKey = ownKey(logos[i] ?? null, creator.id, "public");
    if (logoKey === undefined) return { error: "Invalid upload" };
    const url = urls[i] ? normalizeUrl(urls[i]) : "";
    if (url === null) return { error: `Enter a valid link for ${brands[i]}, or leave it empty` };
    partnerships.push({ brand: brands[i], logoKey: logoKey ?? "", description: descriptions[i] ?? "", url });
  }

  const names = text(form, "service_name", 80);
  const prices = text(form, "service_price", 40);
  const serviceDescs = text(form, "service_desc", 300);
  const services = names.slice(0, LIMITS.services).flatMap((name, i) => (name ? [{ name, price: prices[i] ?? "", description: serviceDescs[i] ?? "" }] : []));

  const gallery: string[] = [];
  for (const value of form.getAll("galleryKey").slice(0, LIMITS.gallery)) {
    const key = ownKey(value, creator.id, "public");
    if (key === undefined) return { error: "Invalid upload" };
    if (key) gallery.push(key);
  }

  const kit = {
    published: form.get("published") === "on",
    headline: String(form.get("headline") ?? "").trim().slice(0, 120),
    about: String(form.get("about") ?? "").trim().slice(0, 2000),
    data: { stats, gender, ages, locations, partnerships, services, gallery } satisfies KitData,
  };
  await db.mediaKit.upsert({ where: { creatorId: creator.id }, update: kit, create: { ...kit, creatorId: creator.id } });
  revalidatePath(`/${creator.handle}/${KIT_SLUG}`);
  return { ok: kit.published ? "Saved. Your media kit is live." : "Saved. Turn on \"Show my media kit\" when you're ready to share it." };
}

const Inquiry = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  company: z.string().trim().max(100).default(""),
  budget: z.string().trim().max(60).default(""),
  message: z.string().trim().min(1, "Write a short message").max(3000),
  // Hidden from people; bots fill it in.
  website: z.string().max(0).optional(),
});

export type InquiryState = { error?: string; sent?: boolean } | undefined;

export async function sendInquiry(creatorId: string, _: InquiryState, form: FormData): Promise<InquiryState> {
  const parsed = Inquiry.safeParse(Object.fromEntries(form));
  if (!parsed.success) return parsed.error.issues[0].path[0] === "website" ? { sent: true } : { error: parsed.error.issues[0].message };
  const creator = await db.creator.findUnique({ where: { id: creatorId }, include: { mediaKit: true } });
  if (!creator || creator.pausedAt || !creator.mediaKit?.published) return { error: "This media kit isn't available right now" };
  const { name, email, company, budget, message } = parsed.data;
  const data = { name, email, company, budget, message };
  await db.brandInquiry.create({ data: { ...data, creatorId } });
  await sendEmail({
    to: creator.email,
    subject: `New brand inquiry from ${data.company || data.name}`,
    html: inquiryEmail({ ...data, creatorName: creator.displayName, link: `${env.appUrl}/dashboard/media-kit` }),
  });
  return { sent: true };
}

export async function deleteInquiry(id: string) {
  const creator = await requireCreator();
  await db.brandInquiry.deleteMany({ where: { id, creatorId: creator.id } });
  revalidatePath("/dashboard/media-kit");
}
