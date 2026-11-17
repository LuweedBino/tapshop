"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { affiliateEmail, escape, sendEmail } from "@/lib/email";
import { affiliateLink, MAX_DAYS, MAX_PERCENT, newAffiliateCode } from "@/lib/affiliates";
import type { FormState } from "./auth";

const Program = z.object({
  affiliateOn: z.string().optional(),
  affiliatePercent: z.coerce.number().int("Commission must be a whole number").min(1, "Commission must be at least 1%").max(MAX_PERCENT, `Commission can be at most ${MAX_PERCENT}%`),
  affiliateDays: z.coerce.number().int("Days must be a whole number").min(1, "A link should count for at least 1 day").max(MAX_DAYS, `A link can count for at most ${MAX_DAYS} days`),
  affiliateNote: z.string().trim().max(1000, "Keep the note under 1000 characters").default(""),
});

export async function saveAffiliateProgram(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = Program.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await db.creator.update({
    where: { id: creator.id },
    data: { affiliateOn: d.affiliateOn === "on", affiliatePercent: d.affiliatePercent, affiliateDays: d.affiliateDays, affiliateNote: d.affiliateNote },
  });
  revalidatePath("/dashboard/affiliates");
  revalidatePath(`/${creator.handle}/affiliates`);
  return { ok: "Saved" };
}

/** Joins a creator's program straight away (no approval) and emails both sides. */
export async function joinAffiliateProgram(programCreatorId: string) {
  const member = await requireCreator();
  const owner = await db.creator.findUnique({ where: { id: programCreatorId } });
  if (!owner || !owner.affiliateOn || owner.pausedAt || owner.id === member.id) redirect("/dashboard/promote");
  const existing = await db.affiliate.findUnique({ where: { creatorId_memberId: { creatorId: owner.id, memberId: member.id } } });
  if (existing) redirect("/dashboard/promote");
  const affiliate = await db.affiliate.create({ data: { creatorId: owner.id, memberId: member.id, code: newAffiliateCode() } });

  await sendEmail({
    to: member.email,
    subject: `You're now an affiliate for ${owner.displayName}`,
    html: affiliateEmail({
      name: member.displayName,
      lines: [
        `Welcome to ${escape(owner.displayName)}'s affiliate program. You earn <strong>${owner.affiliatePercent}%</strong> of every sale that comes through your link, for ${owner.affiliateDays} days after someone clicks it.`,
        `Your link: <a href="${affiliateLink(affiliate.code)}">${affiliateLink(affiliate.code).replace(/^https?:\/\//, "")}</a>`,
        member.stripeAccountId ? "" : "To get paid, connect Stripe on your Payments page. Commissions wait for you until you do.",
      ].filter(Boolean),
      quote: owner.affiliateNote || undefined,
      cta: { label: "Get your links", url: `${env.appUrl}/dashboard/promote` },
    }),
  });
  await sendEmail({
    to: owner.email,
    subject: `${member.displayName} joined your affiliate program`,
    html: affiliateEmail({
      name: owner.displayName,
      lines: [`<strong>${escape(member.displayName)}</strong> (@${escape(member.handle)}) just joined your affiliate program and can start sharing your products.`],
      cta: { label: "See your affiliates", url: `${env.appUrl}/dashboard/affiliates` },
    }),
  });
  revalidatePath("/dashboard/affiliates");
  redirect("/dashboard/promote");
}

/** Blocked affiliates' links stop counting and they earn nothing new; commissions already earned are kept. */
export async function setAffiliateBlocked(affiliateId: string, blocked: boolean) {
  const creator = await requireCreator();
  await db.affiliate.updateMany({ where: { id: affiliateId, creatorId: creator.id }, data: { blockedAt: blocked ? new Date() : null } });
  revalidatePath("/dashboard/affiliates");
}

const Message = z.object({
  subject: z.string().trim().min(1, "Add a subject").max(120),
  body: z.string().trim().min(1, "Write a message").max(5000),
});

/** Saves a message (affiliates see it on their Promote page) and emails it to every active affiliate. */
export async function messageAffiliates(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = Message.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const affiliates = await db.affiliate.findMany({ where: { creatorId: creator.id, blockedAt: null }, include: { member: true } });
  if (affiliates.length === 0) return { error: "You don't have any affiliates to message yet" };
  await db.affiliateMessage.create({ data: { creatorId: creator.id, ...parsed.data } });
  for (const a of affiliates) {
    await sendEmail({
      to: a.member.email,
      subject: `${creator.displayName}: ${parsed.data.subject}`,
      html: affiliateEmail({
        name: a.member.displayName,
        lines: [`A message from <strong>${escape(creator.displayName)}</strong>, whose products you promote:`],
        quote: parsed.data.body,
        cta: { label: "Open your Promote page", url: `${env.appUrl}/dashboard/promote` },
      }),
    });
  }
  revalidatePath("/dashboard/affiliates");
  return { ok: `Sent to ${affiliates.length} affiliate${affiliates.length === 1 ? "" : "s"}` };
}
