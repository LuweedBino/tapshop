import Link from "next/link";
import { getCreator } from "@/lib/auth";

const FEATURES = [
  { title: "Your store, in your bio", body: "One link for Instagram, TikTok, and YouTube that opens a storefront built for phones." },
  { title: "Sell digital products", body: "Guides, templates, presets, e-books. Buyers pay with card, Apple Pay, or Google Pay and get the file instantly." },
  { title: "Grow your email list", body: "Offer a freebie for an email address. Every lead lands in your dashboard, ready to export." },
  { title: "Keep what you earn", body: "0% platform fees. Payouts go straight to your own Stripe account." },
];

export default async function Home() {
  const creator = await getCreator();
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#ede9fe,transparent_60%)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-xl font-black tracking-tight">TapShop</span>
        <nav className="flex items-center gap-2">
          {creator ? (
            <Link href="/dashboard" className="btn">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="px-3 text-sm font-semibold text-neutral-600 hover:text-neutral-900">Sign in</Link>
              <Link href="/signup" className="btn">Start free</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5">
        <section className="py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Turn your link in bio into a <span className="text-violet-600">store</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-600">
            Sell digital products and collect emails from one mobile-first page. Followers tap, pay, and download without leaving the app.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup" className="btn px-6 py-3.5 text-base">Create your store</Link>
          </div>
        </section>
        <section className="grid gap-4 pb-24 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h2 className="font-bold">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
