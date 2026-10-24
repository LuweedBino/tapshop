"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { RESERVED_HANDLES } from "@/lib/format";

export type FormState = { error?: string; ok?: string } | undefined;

const Signup = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "Handle must be 3 to 30 letters, numbers, or underscores"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { displayName, handle, email, password } = parsed.data;
  if (RESERVED_HANDLES.has(handle)) return { error: "That handle is taken" };
  const clash = await db.creator.findFirst({ where: { OR: [{ email }, { handle }] } });
  if (clash) return { error: clash.email === email ? "An account with that email exists" : "That handle is taken" };
  const creator = await db.creator.create({
    data: { displayName, handle, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(creator.id);
  redirect("/dashboard");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const creator = await db.creator.findUnique({ where: { email } });
  if (!creator || !(await bcrypt.compare(password, creator.passwordHash))) return { error: "Wrong email or password" };
  await createSession(creator.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
