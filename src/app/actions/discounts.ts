"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { CODE_RE, normalizeCode } from "@/lib/discounts";
import type { FormState } from "./auth";

const Input = z
  .object({
    code: z.string().transform(normalizeCode).pipe(z.string().regex(CODE_RE, "Use 3-30 letters, numbers, dashes or underscores for the code")),
    type: z.enum(["PERCENT", "FIXED"]),
    amount: z.coerce.number({ error: "Enter the discount amount" }).positive("Enter the discount amount"),
    productId: z.string().trim().default(""),
    maxUses: z.union([z.literal(""), z.coerce.number().int("Use a whole number for the limit").min(1, "The limit must be at least 1").max(1_000_000)]).default(""),
    expiresAt: z.union([z.literal(""), z.coerce.date()]).default(""),
  })
  .refine((d) => d.type === "FIXED" || (Number.isInteger(d.amount) && d.amount <= 100), { message: "Use a whole percent from 1 to 100" })
  .refine((d) => d.type === "PERCENT" || d.amount <= 1_000_000, { message: "That amount is too high" })
  .refine((d) => d.expiresAt === "" || d.expiresAt > new Date(), { message: "Pick an end date that hasn't passed" });

function refresh(handle: string) {
  revalidatePath("/dashboard/discounts");
  revalidatePath(`/${handle}`, "layout");
}

export async function createDiscount(_: FormState, form: FormData): Promise<FormState> {
  const creator = await requireCreator();
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { code, type, amount, productId, maxUses, expiresAt } = parsed.data;
  if (productId && !(await db.product.findFirst({ where: { id: productId, creatorId: creator.id, type: "DIGITAL" } }))) return { error: "Product not found" };
  if (await db.discountCode.findUnique({ where: { creatorId_code: { creatorId: creator.id, code } } })) return { error: `You already have a code called ${code}` };
  await db.discountCode.create({
    data: {
      creatorId: creator.id,
      code,
      type,
      value: type === "PERCENT" ? amount : Math.round(amount * 100),
      productId: productId || null,
      maxUses: maxUses === "" ? null : maxUses,
      expiresAt: expiresAt === "" ? null : expiresAt,
    },
  });
  refresh(creator.handle);
}

export async function setDiscountActive(id: string, active: boolean) {
  const creator = await requireCreator();
  await db.discountCode.updateMany({ where: { id, creatorId: creator.id }, data: { active } });
  refresh(creator.handle);
}

export async function deleteDiscount(id: string) {
  const creator = await requireCreator();
  await db.discountCode.deleteMany({ where: { id, creatorId: creator.id } });
  refresh(creator.handle);
}
