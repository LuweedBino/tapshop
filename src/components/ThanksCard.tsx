import Link from "next/link";
import type { Creator } from "@prisma/client";
import { Avatar } from "./Storefront";

export function ThanksCard({ creator, title, body, download, children }: { creator: Creator; title: string; body: string; download?: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: `linear-gradient(180deg, ${creator.accentColor}22 0%, #fafafa 260px)` }}>
      <main className="mx-auto flex max-w-md flex-col items-center px-5 pt-16 text-center">
        <Avatar creator={creator} size={72} />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-neutral-600">{body}</p>
        {download && (
          <a href={download} className="mt-6 w-full rounded-xl py-3.5 font-semibold text-white" style={{ background: creator.accentColor }}>
            Download now
          </a>
        )}
        {children}
        <Link href={`/${creator.handle}`} className="mt-6 text-sm font-semibold text-neutral-500 hover:text-neutral-800">
          Back to {creator.displayName}&apos;s store
        </Link>
      </main>
    </div>
  );
}
