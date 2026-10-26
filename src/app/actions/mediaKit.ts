"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { inquiryEmail, sendEmail } from "@/lib/email";
import { normalizeUrl, videoEmbed } from "@/lib/affiliate";
import { ownKey } from "@/lib/storage";
import { KIT_SLUG, parseKit, type Block, type KitDoc } from "@/lib/mediaKit";
import type { FormState } from "./auth";

/** Checks what the builder sent: uploads must be this creator's images, links must be real links. */
function clean(doc: KitDoc, creatorId: string): KitDoc | string {
  const image = (key: string) => {
    if (!key) return "";
    return ownKey(key, creatorId, "public") ?? null;
  };
  const link = (url: string, what: string) => (url.trim() ? normalizeUrl(url) ?? `Enter a valid link for ${what}, or leave it empty` : "");
  const style = { ...doc.style, coverKey: image(doc.style.coverKey) };
  if (style.coverKey === null) return "Invalid upload";
  const blocks: Block[] = [];
  for (const b of doc.blocks) {
    switch (b.type) {
      case "brands": {
        const out = [];
        for (const i of b.items.filter((i) => i.brand.trim())) {
          const logoKey = image(i.logoKey);
          if (logoKey === null) return "Invalid upload";
          const url = link(i.url, i.brand);
          if (url.startsWith("Enter")) return url;
          out.push({ ...i, logoKey, url });
        }
        blocks.push({ ...b, items: out });
        break;
      }
      case "links": {
        const out = [];
        for (const i of b.items.filter((i) => i.label.trim() || i.url.trim())) {
          const url = link(i.url, `"${i.label}"`);
          if (!url || url.startsWith("Enter")) return url || `Add a link for "${i.label}"`;
          out.push({ ...i, url });
        }
        blocks.push({ ...b, items: out });
        break;
      }
      case "gallery": {
        const images = b.images.map(image);
        if (images.includes(null)) return "Invalid upload";
        blocks.push({ ...b, images: images.filter((k): k is string => !!k) });
        break;
      }
      case "video": {
        const items = b.items.filter((i) => i.url.trim());
        const bad = items.find((i) => !videoEmbed(i.url, { social: true }));
        if (bad) return `"${bad.url.slice(0, 60)}" isn't a video link we can show. Use a YouTube, TikTok, Instagram, Vimeo or Loom link.`;
        blocks.push({ ...b, items });
        break;
      }
      case "stats":
        blocks.push({ ...b, items: b.items.filter((i) => i.followers > 0 || i.handle.trim()) });
        break;
      case "highlights":
        blocks.push({ ...b, items: b.items.filter((i) => i.value.trim() || i.label.trim()) });
        break;
      case "audience":
        blocks.push({ ...b, ages: b.ages.filter((i) => i.label.trim()), locations: b.locations.filter((i) => i.label.trim()) });
        break;
      case "testimonials":
        blocks.push({ ...b, items: b.items.filter((i) => i.quote.trim()) });
        break;
      case "rates":
        blocks.push({ ...b, items: b.items.filter((i) => i.name.trim()) });
        break;
      default:
        blocks.push(b);
    }
  }
  return { style: style as KitDoc["style"], tags: doc.tags, blocks };
}

export async function saveMediaKit(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  let raw: { headline?: unknown; published?: unknown; doc?: unknown };
  try {
    raw = JSON.parse(String(form.get("kit") ?? "{}"));
  } catch {
    return { error: "Something went wrong, please try again" };
  }
  const doc = clean(parseKit(raw.doc), creator.id);
  if (typeof doc === "string") return { error: doc };
  const kit = {
    published: raw.published === true,
    headline: typeof raw.headline === "string" ? raw.headline.trim().slice(0, 120) : "",
    about: "",
    data: { version: 2, ...doc },
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
