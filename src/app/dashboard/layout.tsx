import Link from "next/link";
import { cookies } from "next/headers";
import { isAdmin, requireCreator } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { DashTopNav } from "@/components/DashTopNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const creator = await requireCreator();
  const dark = (await cookies()).get("tapshop_theme")?.value === "dark";
  // The Studio marks itself data-studio-full so it can use the whole screen width on computers.
  return (
    <div data-dash-root className={`mx-auto min-h-dvh max-w-6xl md:has-[[data-studio-full]]:max-w-none ${dark ? "tapshop-dark" : ""}`}>
      <aside className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
        <DashTopNav
          admin={isAdmin(creator)}
          actions={
            <div className="flex items-center gap-3">
              <Link href={`/${creator.handle}`} target="_blank" className="text-xs font-semibold text-neutral-500">/{creator.handle} ↗</Link>
              <ThemeToggle initialDark={dark} />
              <form action={logout}>
                <button className="text-xs text-neutral-500">Sign out</button>
              </form>
            </div>
          }
        />
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8">
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
