"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/app/actions/auth";
import { Submit } from "./Submit";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "login" ? login : signup, undefined);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-xl font-black tracking-tight">TapShop</Link>
      <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your store"}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {mode === "login" ? "Sign in to manage your store." : "Free to start. Your store is live in a minute."}
      </p>
      <form action={action} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <div>
              <label className="label" htmlFor="displayName">Your name</label>
              <input className="input" id="displayName" name="displayName" required autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="handle">Store handle</label>
              <div className="flex items-center rounded-xl border border-neutral-300 bg-white pl-3.5 focus-within:border-neutral-900">
                <span className="text-neutral-400">tapshop/</span>
                <input className="w-full bg-transparent py-2.5 pr-3.5 text-[16px] outline-none" id="handle" name="handle" required pattern="[A-Za-z0-9_]{3,30}" autoCapitalize="none" />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <Submit className="btn w-full" pendingText="One moment…">{mode === "login" ? "Sign in" : "Create store"}</Submit>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        {mode === "login" ? (
          <>New here? <Link className="font-semibold text-neutral-900" href="/signup">Create a store</Link></>
        ) : (
          <>Have an account? <Link className="font-semibold text-neutral-900" href="/login">Sign in</Link></>
        )}
      </p>
    </main>
  );
}
