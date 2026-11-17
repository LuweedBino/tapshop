"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLUG_RE } from "@/lib/pages";
import { KIT_SLUG, OLD_KIT_SLUG } from "@/lib/mediaKit";
import { ownKey } from "@/lib/storage";
import { normalizeUrl } from "@/lib/affiliate";
import { pageDesignKeys, parsePageDesign } from "@/lib/pageDesign";
import type { FormState } from "./auth";

const PageInput = z.object({
  title: z.string().trim().min(1, "Give the page a name").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Use 1-40 lowercase letters, numbers and dashes for the link")
    .refine((s) => s !== KIT_SLUG && s !== OLD_KIT_SLUG, "That link is used by your portfolio")
    .refine((s) => s !== "affiliates", "That link is used by your affiliate sign-up page"),
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
  // A new page opens straight in the page builder.
  redirect(pageId ? `/dashboard/products?page=${id}` : `/dashboard/products/pages/${id}`);
}

/** Saves everything the page builder edits: name, link, description and the design. */
export async function savePageBuilder(pageId: string, _: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = PageInput.safeParse({ title: form.get("title"), slug: form.get("slug"), description: form.get("description") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const page = await db.page.findFirst({ where: { id: pageId, creatorId: creator.id } });
  if (!page) return { error: "Page not found" };
  const clash = await db.page.findFirst({ where: { creatorId: creator.id, slug: parsed.data.slug, NOT: { id: pageId } } });
  if (clash) return { error: `You already have a page at /${creator.handle}/${parsed.data.slug}` };

  let raw: unknown = {};
  try {
    raw = JSON.parse(String(form.get("design") ?? "{}"));
  } catch {
    return { error: "Something went wrong reading the page. Please try again." };
  }
  const design = parsePageDesign(raw, creator);
  // Pictures must be the creator's own uploads.
  if (pageDesignKeys(design).some((k) => !ownKey(k, creator.id, "public"))) return { error: "One of the pictures couldn't be used. Please upload it again." };
  // Links must be real web links; anything else is cleared so the page never shows a broken button.
  for (const b of design.blocks) {
    if (b.type === "button" || b.type === "image") {
      const field = b.type === "button" ? "url" : "link";
      const value = b.type === "button" ? b.url : b.link;
      if (value.trim() && !normalizeUrl(value)) return { error: `"${value}" isn't a web link. Check the ${b.type === "button" ? "button" : "picture"} link.` };
      Object.assign(b, { [field]: value.trim() ? normalizeUrl(value)! : "" });
    }
  }
  for (const l of design.footer.links) {
    if (l.url.trim() && !normalizeUrl(l.url)) return { error: `"${l.url}" isn't a web link. Check your footer links.` };
    l.url = l.url.trim() ? normalizeUrl(l.url)! : "";
  }

  await db.page.update({ where: { id: page.id }, data: { ...parsed.data, design } });
  revalidatePath(`/${creator.handle}`, "layout");
  revalidatePath(`/dashboard/products/pages/${page.id}`);
  return { ok: "Saved" };
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
