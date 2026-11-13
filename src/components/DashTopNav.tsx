"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashNav } from "@/components/DashNav";

const SHOW_MS = 1400;
const FOLD_MS = 350;
const SHAKE_MS = 1100;
const POP_MS = 1300;

// Phone header: a glossy 3D logo button, a small toggle on its lower-left corner, and the page buttons,
// which fold away. Tapping the logo or the toggle shows them. On every page load the logo presses in and
// sparkles, the buttons open, fold again, then the toggle shakes so people notice it.
// On computers the buttons sit in the sidebar and always show.
export function DashTopNav({ admin, actions }: { admin: boolean; actions: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const [pop, setPop] = useState(false);
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
    if (!still) {
      later(() => setPop(true), 50);
      later(() => setPop(false), 50 + POP_MS);
    }
    later(() => setOpen(true), 50);
    later(() => setOpen(false), 50 + SHOW_MS);
    if (!still) {
      later(() => setShake(true), 50 + SHOW_MS + FOLD_MS);
      later(() => setShake(false), 50 + SHOW_MS + FOLD_MS + SHAKE_MS);
    }
    return () => {
      ids.forEach(clearTimeout);
      setShake(false);
      setPop(false);
    };
  }, [path]);

  function toggle() {
    stopIntro();
    setOpen((o) => !o);
  }

  // Restart the press-and-sparkle: switch it off, then on again two frames later so the animation replays.
  function sparkle() {
    setPop(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPop(true);
        timers.current.push(window.setTimeout(() => setPop(false), POP_MS));
      }),
    );
  }

  return (
    <>
      <div className="flex items-center justify-between md:mb-6 md:block">
        <div className={`relative ${pop ? "dash-pop" : ""}`}>
          <Link
            href="/dashboard"
            className="dash-logo"
            onClick={(e) => {
              // On phones the logo is the big button for the page buttons.
              if (phone) {
                e.preventDefault();
                toggle();
              }
              sparkle();
            }}
          >
            TapShop
          </Link>
          <span aria-hidden="true" className="dash-spark" style={{ top: "-7px", left: "18%" }}>✦</span>
          <span aria-hidden="true" className="dash-spark" style={{ top: "30%", right: "-9px" }}>✦</span>
          <span aria-hidden="true" className="dash-spark" style={{ bottom: "-6px", left: "62%" }}>✧</span>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="dash-nav"
            aria-label={open ? "Hide page buttons" : "Show page buttons"}
            title={open ? "Hide page buttons" : "Show page buttons"}
            className={`absolute -bottom-3 -left-3 z-[1] grid h-5 w-5 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm md:hidden ${shake ? "dash-shake" : ""}`}
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
