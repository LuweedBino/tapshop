"use client";

import Link from "next/link";
import { useActionState, useId, useRef } from "react";
import type { Creator } from "@prisma/client";
import { adminDeleteCreator, adminDisconnectStripe, adminSetPassword, adminSetPaused, adminUpdateCreator } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/auth";
import { Submit } from "./Submit";

type AdminCreator = Pick<Creator, "id" | "displayName" | "handle" | "email" | "bio" | "stripeAccountId" | "stripeReady" | "pausedAt">;

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.ok) return <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>;
  return null;
}

export function AccountForm({ creator }: { creator: AdminCreator }) {
  const [state, action] = useActionState<FormState, FormData>(adminUpdateCreator.bind(null, creator.id), undefined);
  const id = useId(); // the Admin list renders one of these per creator
  return (
    <form action={action} className="card space-y-4">
      <h2 className="font-semibold">Account details</h2>
      <div>
        <label htmlFor={`${id}-displayName`} className="label">Name</label>
        <input id={`${id}-displayName`} name="displayName" className="input" defaultValue={creator.displayName} required />
      </div>
      <div>
        <label htmlFor={`${id}-handle`} className="label">Store link</label>
        <div className="flex items-center rounded-xl border border-neutral-300 bg-white pl-3.5 focus-within:border-neutral-900">
          <span className="text-neutral-400">/</span>
          <input id={`${id}-handle`} name="handle" className="w-full bg-transparent py-2.5 pr-3.5 text-[16px] outline-none" defaultValue={creator.handle} required pattern="[A-Za-z0-9_]{3,30}" autoCapitalize="none" />
        </div>
        <p className="mt-1 text-xs text-neutral-500">Changing it breaks the old link in the creator&apos;s bio.</p>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="label">Login email</label>
        <input id={`${id}-email`} name="email" type="email" className="input" defaultValue={creator.email} required />
      </div>
      <div>
        <label htmlFor={`${id}-bio`} className="label">Bio</label>
        <textarea id={`${id}-bio`} name="bio" className="input" rows={3} maxLength={300} defaultValue={creator.bio} />
      </div>
      <Submit>Save changes</Submit>
      <Message state={state} />
    </form>
  );
}

export function PasswordForm({ creatorId }: { creatorId: string }) {
  const [state, action] = useActionState<FormState, FormData>(adminSetPassword.bind(null, creatorId), undefined);
  return (
    <form action={action} className="card">
      <h2 className="font-semibold">Set a new password</h2>
      <p className="mt-1 text-sm text-neutral-500">For a creator who is locked out. Their old password stops working.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input name="password" type="text" className="input" placeholder="At least 8 characters" minLength={8} required autoComplete="off" aria-label="New password" />
        <Submit className="btn shrink-0">Set password</Submit>
      </div>
      <Message state={state} />
    </form>
  );
}

export function StripeForm({ creator }: { creator: AdminCreator }) {
  const [state, action] = useActionState<FormState, FormData>(adminDisconnectStripe.bind(null, creator.id), undefined);
  return (
    <form action={action} className="card" onSubmit={(e) => { if (!confirm("Disconnect Stripe? The store stops taking payments until the creator connects again.")) e.preventDefault(); }}>
      <h2 className="font-semibold">Stripe</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {creator.stripeReady ? "Connected" : creator.stripeAccountId ? "Started, not finished" : "Not connected"}
        {creator.stripeAccountId && <> · <code className="text-xs">{creator.stripeAccountId}</code></>}
      </p>
      {creator.stripeAccountId && (
        <>
          <p className="mt-2 text-sm text-neutral-500">Disconnecting unlinks this Stripe account from TapShop. The creator&apos;s Stripe account and its money stay with them.</p>
          <Submit className="btn-secondary mt-4" pendingText="Disconnecting…">Disconnect Stripe</Submit>
        </>
      )}
      <Message state={state} />
    </form>
  );
}

export function DeleteForm({ creator, isSelf }: { creator: AdminCreator; isSelf: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(adminDeleteCreator.bind(null, creator.id), undefined);
  const id = useId();
  return (
    <form action={action} className="card border-red-200">
      <h2 className="font-semibold text-red-700">Delete account</h2>
      {isSelf ? (
        <p className="mt-1 text-sm text-neutral-500">This is your own account, so it can&apos;t be deleted here.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-neutral-500">
            Permanently deletes this creator, their store, products, orders and leads. Past buyers&apos; download links stop working. This can&apos;t be undone.
          </p>
          <label htmlFor={`${id}-confirm`} className="label mt-4">Type <b>{creator.handle}</b> to confirm</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id={`${id}-confirm`} name="confirm" className="input" autoComplete="off" autoCapitalize="none" required />
            <Submit className="btn shrink-0 !bg-red-600" pendingText="Deleting…">Delete forever</Submit>
          </div>
        </>
      )}
      <Message state={state} />
    </form>
  );
}

export function PauseForm({ creator, isSelf }: { creator: AdminCreator; isSelf: boolean }) {
  const paused = Boolean(creator.pausedAt);
  const [state, action] = useActionState<FormState, FormData>(adminSetPaused.bind(null, creator.id, !paused), undefined);
  return (
    <form action={action} className="card" onSubmit={(e) => { if (!paused && !confirm(`Pause ${creator.displayName}? Their store goes offline and can't take new sales.`)) e.preventDefault(); }}>
      <h2 className="font-semibold">{paused ? "Account paused" : "Pause account"}</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {paused
          ? `Paused since ${creator.pausedAt!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. The store is offline and can't take new sales. Nothing was deleted.`
          : "Takes the store offline and blocks new sales and sign-ups. The creator can still log in, and past buyers keep their downloads. You can resume any time."}
      </p>
      {isSelf && !paused ? (
        <p className="mt-2 text-sm text-neutral-500">This is your own account, so it can&apos;t be paused here.</p>
      ) : (
        <Submit className={paused ? "btn mt-4" : "btn-secondary mt-4"} pendingText={paused ? "Resuming…" : "Pausing…"}>{paused ? "Resume account" : "Pause account"}</Submit>
      )}
      <Message state={state} />
    </form>
  );
}

const quick = "inline-flex w-full items-center gap-1.5 whitespace-nowrap rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold transition";
const tones = {
  neutral: "border-neutral-300 text-neutral-900 hover:bg-neutral-50",
  danger: "border-red-200 text-red-600 hover:bg-red-50",
  good: "border-green-300 text-green-700 hover:bg-green-50",
};

// 24×24 stroke icons drawn at 14px, so they sit with text-xs labels.
const ICONS = {
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2" /></>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  play: <path d="M7 4v16l13-8Z" />,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/** Quick actions under each creator on the Admin list. Password and delete open in a pop-up; edit opens the full page. */
export function QuickActions({ creator, isSelf }: { creator: AdminCreator; isSelf: boolean }) {
  const paused = Boolean(creator.pausedAt);
  const [pauseState, pause] = useActionState<FormState, FormData>(adminSetPaused.bind(null, creator.id, !paused), undefined);
  return (
    <div className="mt-2.5">
      <div className="grid w-max grid-cols-2 gap-1.5">
        <Link href={`/dashboard/admin/creators/${creator.id}`} className={`${quick} ${tones.neutral}`}><Icon name="edit" />Edit account</Link>
        <Popup label="Reset password" icon="key" title={`Reset password for ${creator.displayName}`}><PasswordForm creatorId={creator.id} /></Popup>
        {!(isSelf && !paused) && (
          <form action={pause} onSubmit={(e) => { if (!paused && !confirm(`Pause ${creator.displayName}? Their store goes offline and can't take new sales.`)) e.preventDefault(); }}>
            <button className={`${quick} ${paused ? tones.good : tones.neutral}`}><Icon name={paused ? "play" : "pause"} />{paused ? "Resume" : "Pause"}</button>
          </form>
        )}
        {!isSelf && <Popup label="Delete" icon="trash" title={`Delete ${creator.displayName}`} danger><DeleteForm creator={creator} isSelf={false} /></Popup>}
      </div>
      {pauseState?.error && <p className="mt-1 text-xs text-red-700">{pauseState.error}</p>}
    </div>
  );
}

function Popup({ label, icon, title, danger, children }: { label: string; icon: keyof typeof ICONS; title: string; danger?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`${quick} ${danger ? tones.danger : tones.neutral}`}><Icon name={icon} />{label}</button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-transparent p-0 backdrop:bg-black/40"
      >
        <div className="relative">
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-neutral-400 hover:text-neutral-900">✕</button>
          {children}
        </div>
      </dialog>
    </>
  );
}
