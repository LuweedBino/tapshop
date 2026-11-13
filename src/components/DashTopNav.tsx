"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashNav } from "@/components/DashNav";

const SHOW_MS = 1400;
const FOLD_MS = 350;
const SHAKE_MS = 1100;

// Phone header: logo, a small toggle on its lower-left corner, and the page buttons, which fold away.
// On every page load the buttons open, fold again, then the toggle shakes so people notice it.
// On computers the buttons sit in the sidebar and always show.
export function DashTopNav({ admin, actions }: { admin: boolean; actions: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [phone, setPhone] = useState(true);
  const timers = useRef<number[]>([]);

  const stopIntro = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShake(false);
  };

  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const update = () => setPhone(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const ids: number[] = [];
    timers.current = ids;
    const later = (fn: () => void, ms: number) => {
      ids.push(window.setTimeout(fn, ms));
    };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    later(() => setOpen(true), 50);
    later(() => setOpen(false), 50 + SHOW_MS);
    if (!still) {
      later(() => setShake(true), 50 + SHOW_MS + FOLD_MS);
      later(() => setShake(false), 50 + SHOW_MS + FOLD_MS + SHAKE_MS);
    }
    return () => {
      ids.forEach(clearTimeout);
      setShake(false);
    };
  }, [path]);

  function toggle() {
    stopIntro();
    setOpen((o) => !o);
  }

  return (
    <>
      <div className="flex items-center justify-between md:mb-6 md:block">
        <div className="relative">
          <Link href="/dashboard" className="text-xl font-black tracking-tight">TapShop</Link>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="dash-nav"
            aria-label={open ? "Hide page buttons" : "Show page buttons"}
            title={open ? "Hide page buttons" : "Show page buttons"}
            className={`absolute -bottom-3 -left-3 grid h-5 w-5 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm md:hidden ${shake ? "dash-shake" : ""}`}
          >
            <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </button>
        </div>
        {actions}
      </div>
      <div
        id="dash-nav"
        className={`grid transition-[grid-template-rows] duration-300 ease-out md:grid-rows-[1fr] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden" inert={phone && !open ? true : undefined}>
          <div className="pt-3 md:pt-0">
            <DashNav admin={admin} />
          </div>
        </div>
      </div>
    </>
  );
}
