"use client";

import { useState } from "react";

// Dashboard light/dark switch. The choice is kept in a cookie so the server renders the
// right theme on the next visit without a flash.
export function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark);
  function toggle() {
    // Read the page itself: the layout renders one switch for phones and one for desktop.
    const root = document.querySelector("[data-dash-root]");
    const next = !root?.classList.contains("tapshop-dark");
    setDark(next);
    root?.classList.toggle("tapshop-dark", next);
    document.cookie = `tapshop_theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      <span>{dark ? "Dark mode" : "Light mode"}</span>
      <span aria-hidden="true" className={`flex h-[18px] w-[30px] items-center rounded-full p-[2px] transition-colors ${dark ? "bg-violet-400" : "bg-neutral-300"}`}>
        <span className={`h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${dark ? "translate-x-[12px]" : ""}`} />
      </span>
    </button>
  );
}
