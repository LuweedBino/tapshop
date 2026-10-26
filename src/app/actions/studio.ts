"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { ownKey } from "@/lib/storage";
import { parseBannerStyle } from "@/lib/banner";
import type { FormState } from "./auth";

const Input = z.discriminatedUnion("target", [
  z.object({ target: z.literal("avatar"), key: z.string() }),
  z.object({ target: z.literal("banner"), key: z.string() }),
  z.object({ target: z.literal("cover"), key: z.string(), productId: z.string().min(1) }),
]);

export type StudioImageTarget = z.infer<typeof Input>;

/** Puts an image exported from Studio (already uploaded as a public file) to use. */
export async function saveStudioImage(input: StudioImageTarget): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Choose where to use the image" };
  const key = ownKey(parsed.data.key, creator.id, "public");
  if (!key) return { error: "Invalid image" };

  const data = parsed.data;
  if (data.target === "avatar") {
    await db.creator.update({ where: { id: creator.id }, data: { avatarKey: key } });
  } else if (data.target === "banner") {
    const bannerStyle = { ...parseBannerStyle(creator.bannerStyle), source: "upload" as const };
    await db.creator.update({ where: { id: creator.id }, data: { bannerKey: key, bannerStyle } });
  } else {
    // Links have no cover, and archived products are hidden from the dashboard.
    const { count } = await db.product.updateMany({
      where: { id: data.productId, creatorId: creator.id, archived: false, type: { not: "LINK" } },
      data: { coverKey: key },
    });
    if (!count) return { error: "That product can't have a cover" };
    revalidatePath(`/dashboard/products/${data.productId}`);
    revalidatePath("/dashboard/products");
  }
  revalidatePath(`/${creator.handle}`, "layout");
  revalidatePath("/dashboard/store");
  return { ok: data.target === "avatar" ? "Profile photo updated" : data.target === "banner" ? "Banner updated" : "Product cover updated" };
}
