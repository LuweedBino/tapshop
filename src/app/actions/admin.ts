"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { RESERVED_HANDLES } from "@/lib/format";
import type { FormState } from "./auth";

const Account = z.object({
  displayName: z.string().trim().min(1, "Enter a name").max(80),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Store link must be 3 to 30 letters, numbers, or underscores"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  bio: z.string().trim().max(300, "Keep the bio under 300 characters"),
});

async function target(id: string) {
  const creator = await db.creator.findUnique({ where: { id } });
  if (!creator) redirect("/dashboard/admin");
  return creator;
}

function refresh(id: string, ...handles: string[]) {
  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/admin/creators/${id}`);
  for (const h of handles) revalidatePath(`/${h}`);
}

export async function adminUpdateCreator(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const creator = await target(id);
  const parsed = Account.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { handle, email } = parsed.data;
  if (handle !== creator.handle && (RESERVED_HANDLES.has(handle) || (await db.creator.findUnique({ where: { handle } }))))
    return { error: "That store link is taken" };
  if (email !== creator.email && (await db.creator.findUnique({ where: { email } })))
    return { error: "Another account already uses that email" };
  await db.creator.update({ where: { id }, data: parsed.data });
  refresh(id, creator.handle, handle);
  return { ok: "Saved" };
}

export async function adminSetPassword(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  await target(id);
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  await db.creator.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { ok: "Password changed. Share it with the creator so they can log in." };
}

// Unlinks the Stripe account from TapShop only; the creator's Stripe account itself stays as it is.
export async function adminDisconnectStripe(id: string): Promise<FormState> {
  await requireAdmin();
  const creator = await target(id);
  await db.creator.update({ where: { id }, data: { stripeAccountId: null, stripeReady: false } });
  refresh(id, creator.handle);
  return { ok: "Stripe disconnected. The store can't take payments until the creator connects again." };
}

export async function adminDeleteCreator(id: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const creator = await target(id);
  if (creator.id === admin.id) return { error: "You can't delete your own account from here." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== creator.handle)
    return { error: `Type ${creator.handle} to confirm.` };
  // Products, orders and leads go with it (onDelete: Cascade), so past buyers' download links stop working.
  await db.creator.delete({ where: { id } });
  refresh(id, creator.handle);
  redirect("/dashboard/admin");
}
