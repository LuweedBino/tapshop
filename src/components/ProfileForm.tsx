"use client";

import { useActionState, useState } from "react";
import type { Creator } from "@prisma/client";
import { saveProfile } from "@/app/actions/dashboard";
import type { FormState } from "@/app/actions/auth";
import { SOCIALS, type Socials } from "@/lib/format";
import { FileUpload } from "./FileUpload";
import { Submit } from "./Submit";

const SWATCHES = ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#2563eb", "#171717"];

export function ProfileForm({ creator }: { creator: Creator }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, undefined);
  const [accent, setAccent] = useState(creator.accentColor);
  const socials = (creator.socialLinks ?? {}) as Socials;
  return (
    <form action={action} className="space-y-5">
      <div className="card space-y-5">
        <FileUpload name="avatarKey" visibility="public" initialKey={creator.avatarKey} accept="image/*" label="Profile photo" />
        <div>
          <label className="label" htmlFor="displayName">Display name</label>
          <input className="input" id="displayName" name="displayName" defaultValue={creator.displayName} required />
        </div>
        <div>
          <label className="label" htmlFor="handle">Handle</label>
          <input className="input" id="handle" name="handle" defaultValue={creator.handle} required pattern="[A-Za-z0-9_]{3,30}" autoCapitalize="none" />
        </div>
        <div>
          <label className="label" htmlFor="bio">Bio</label>
          <textarea className="input min-h-24" id="bio" name="bio" defaultValue={creator.bio} maxLength={300} />
        </div>
        <div>
          <span className="label">Accent color</span>
          <input type="hidden" name="accentColor" value={accent} />
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => setAccent(c)} className={`h-9 w-9 rounded-full ${accent === c ? "ring-2 ring-neutral-900 ring-offset-2" : ""}`} style={{ background: c }} />
            ))}
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white" />
          </div>
        </div>
      </div>
      <div className="card space-y-4">
        <h2 className="font-semibold">Social links</h2>
        {SOCIALS.map((k) => (
          <div key={k}>
            <label className="label capitalize" htmlFor={`social_${k}`}>{k === "x" ? "X (Twitter)" : k}</label>
            <input className="input" id={`social_${k}`} name={`social_${k}`} defaultValue={socials[k] ?? ""} placeholder={k === "website" ? "yoursite.com" : "@username or full URL"} autoCapitalize="none" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Submit>Save changes</Submit>
        {state?.ok && <span className="text-sm font-medium text-green-700">Saved</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
