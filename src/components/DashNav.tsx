"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/store", label: "Store" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/payments", label: "Payments" },
];

export function DashNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map((i) => {
        const active = i.href === "/dashboard" ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
