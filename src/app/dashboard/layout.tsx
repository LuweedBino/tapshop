import Link from "next/link";
import { cookies } from "next/headers";
import { isAdmin, requireCreator } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { DashNav } from "@/components/DashNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const creator = await requireCreator();
  const dark = (await cookies()).get("tapshop_theme")?.value === "dark";
  return (
    <div data-dash-root className={`mx-auto min-h-dvh max-w-6xl md:flex md:gap-8 md:px-6 md:py-8 ${dark ? "tapshop-dark" : ""}`}>
      <aside className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:static md:w-52 md:shrink-0 md:border-0 md:bg-transparent md:p-0">
        <div className="mb-3 flex items-center justify-between md:mb-6 md:block">
          <Link href="/dashboard" className="text-xl font-black tracking-tight">TapShop</Link>
          <div className="flex items-center gap-3 md:mt-1 md:block">
            <Link href={`/${creator.handle}`} target="_blank" className="text-xs font-semibold text-neutral-500">/{creator.handle} ↗</Link>
            <span className="md:hidden">
              <ThemeToggle initialDark={dark} />
            </span>
            <form action={logout} className="md:hidden">
              <button className="text-xs text-neutral-500">Sign out</button>
            </form>
          </div>
        </div>
        <DashNav admin={isAdmin(creator)} />
        <div className="hidden md:mt-6 md:block md:px-3">
          <ThemeToggle initialDark={dark} />
        </div>
        <form action={logout} className="hidden md:mt-6 md:block">
          <button className="px-3 text-sm text-neutral-500 hover:text-neutral-900">Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:p-0">
        {creator.pausedAt && (
          <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your store is paused, so visitors can&apos;t see it or buy. Your past buyers can still download what they bought. Contact TapShop support to turn it back on.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
