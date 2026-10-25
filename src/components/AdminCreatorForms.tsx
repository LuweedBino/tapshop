"use client";

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

const quick = "whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium hover:bg-neutral-100";

/** Edit, password, pause and delete without leaving the Admin list. Edit, password and delete open in a pop-up. */
export function QuickActions({ creator, isSelf }: { creator: AdminCreator; isSelf: boolean }) {
  const paused = Boolean(creator.pausedAt);
  const [pauseState, pause] = useActionState<FormState, FormData>(adminSetPaused.bind(null, creator.id, !paused), undefined);
  return (
    <div className="mt-2">
      <div className="-ml-2 flex max-w-64 flex-wrap items-center gap-0.5">
        <Popup label="Edit account" title={`Edit ${creator.displayName}`}><AccountForm creator={creator} /></Popup>
        <Popup label="Reset password" title={`Reset password for ${creator.displayName}`}><PasswordForm creatorId={creator.id} /></Popup>
        {!(isSelf && !paused) && (
          <form action={pause} onSubmit={(e) => { if (!paused && !confirm(`Pause ${creator.displayName}? Their store goes offline and can't take new sales.`)) e.preventDefault(); }}>
            <button className={`${quick} ${paused ? "text-green-700" : "text-neutral-600 hover:text-neutral-900"}`}>{paused ? "Resume" : "Pause"}</button>
          </form>
        )}
        {!isSelf && <Popup label="Delete" title={`Delete ${creator.displayName}`} danger><DeleteForm creator={creator} isSelf={false} /></Popup>}
      </div>
      {pauseState?.error && <p className="mt-1 text-xs text-red-700">{pauseState.error}</p>}
    </div>
  );
}

function Popup({ label, title, danger, children }: { label: string; title: string; danger?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`${quick} ${danger ? "text-red-600 hover:!bg-red-50" : "text-neutral-600 hover:text-neutral-900"}`}>{label}</button>
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
