"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLUG_RE } from "@/lib/pages";
import { KIT_SLUG } from "@/lib/mediaKit";
import type { FormState } from "./auth";

const PageInput = z.object({
  title: z.string().trim().min(1, "Give the page a name").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Use 1-40 lowercase letters, numbers and dashes for the link")
    .refine((s) => s !== KIT_SLUG, "That link is used by your media kit"),
  description: z.string().trim().max(300).default(""),
});

export async function savePage(pageId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = PageInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const clash = await db.page.findFirst({ where: { creatorId: creator.id, slug: parsed.data.slug, NOT: pageId ? { id: pageId } : undefined } });
  if (clash) return { error: `You already have a page at /${creator.handle}/${parsed.data.slug}` };

  let id = pageId;
  if (pageId) {
    const res = await db.page.updateMany({ where: { id: pageId, creatorId: creator.id }, data: parsed.data });
    if (res.count === 0) return { error: "Page not found" };
  } else {
    id = (await db.page.create({ data: { ...parsed.data, creatorId: creator.id } })).id;
  }
  revalidatePath(`/${creator.handle}`, "layout");
  redirect(`/dashboard/products?page=${id}`);
}

/** Deletes a page. Its products move back to the main store, hidden so they don't appear there by surprise. */
export async function deletePage(pageId: string) {
  const creator = await requireCreator();
  const page = await db.page.findFirst({ where: { id: pageId, creatorId: creator.id } });
  if (!page) return;
  await db.$transaction([
    db.product.updateMany({ where: { pageId: page.id }, data: { published: false } }),
    db.page.delete({ where: { id: page.id } }),
  ]);
  revalidatePath(`/${creator.handle}`, "layout");
  redirect("/dashboard/products");
}
