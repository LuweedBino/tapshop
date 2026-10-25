"use client";

import { useActionState, useState } from "react";
import type { Page } from "@prisma/client";
import { deletePage, savePage } from "@/app/actions/pages";
import type { FormState } from "@/app/actions/auth";
import { SLUG_PATTERN, slugify } from "@/lib/pages";
import { Submit } from "./Submit";

export function PageForm({ page, handle, appUrl }: { page?: Page; handle: string; appUrl: string }) {
  const [state, action] = useActionState<FormState, FormData>(savePage.bind(null, page?.id ?? null), undefined);
  // A new page's link follows its name until the creator edits the link themselves.
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <div className="card space-y-5">
          <div>
            <label className="label" htmlFor="title">Page name</label>
            <input className="input" id="title" name="title" defaultValue={page?.title} required maxLength={80} placeholder="e.g. Coaching, Summer sale, My gear" onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="slug">Link</label>
            <div className="flex items-center rounded-xl border border-neutral-300 bg-white pl-3.5 focus-within:border-neutral-900">
              <span className="shrink-0 text-neutral-400">{appUrl.replace(/^https?:\/\//, "")}/{handle}/</span>
              <input id="slug" name="slug" className="w-full bg-transparent py-2.5 pr-3.5 text-[16px] outline-none" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} required pattern={SLUG_PATTERN} maxLength={40} autoCapitalize="none" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Lowercase letters, numbers and dashes.{page && " Changing it breaks the old link."}</p>
          </div>
          <div>
            <label className="label" htmlFor="description">Description (optional)</label>
            <textarea className="input" id="description" name="description" rows={3} maxLength={300} defaultValue={page?.description} placeholder="Shown under your name at the top of this page" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Submit>{page ? "Save" : "Create page"}</Submit>
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
      {page && (
        <form action={deletePage.bind(null, page.id)} onSubmit={(e) => { if (!confirm(`Delete the "${page.title}" page? Its products move to your main store as Hidden, so nothing is lost.`)) e.preventDefault(); }}>
          <button className="text-sm font-medium text-red-600 hover:underline">Delete this page</button>
        </form>
      )}
    </div>
  );
}
