"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashNav } from "@/components/DashNav";

// Pixie dust around the logo: tiny glowing specks (and a few tiny stars) that burst out once as the logo
// flashes. Fixed pseudo-random spots, so server and browser match.
const DUST = Array.from({ length: 24 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const x = (i + r(1) * 0.8) / 24, star = i % 4 === 1, size = star ? 6 + r(2) * 3 : 2.5 + r(2) * 2.5;
  const ang = r(4) * Math.PI * 2, dist = 10 + r(5) * 14;
  return {
    star,
    style: {
      left: `${(x * 104 - 2).toFixed(1)}%`, top: `${(r(3) * 130 - 15).toFixed(1)}%`, "--s": `${size.toFixed(1)}px`,
      "--c": `${(r(6) * 0.15).toFixed(2)}s`,
      "--dx": `${(Math.cos(ang) * dist).toFixed(1)}px`, "--dy": `${(Math.sin(ang) * dist - 4).toFixed(1)}px`,
    } as React.CSSProperties,
  };
});

// One flowing sequence, each step starting while the last one settles:
// buttons glide open, glide shut, a breeze ripples out of the toggle, then sweeps across the logo.
const SHOW_MS = 1300;
const BREEZE_AFTER_FOLD = 260;
const BREEZE_MS = 900;
const POP_AFTER_BREEZE = 380;
const POP_MS = 1100;
const WELCOME_MS = 5 * 60 * 1000;
const WELCOME_KEY = "tapshop-nav-welcome";

// Phone header: a glossy 3D logo button, a small toggle on its lower-left corner, and the page buttons,
// which fold away. Tapping the logo or the toggle shows them. On every page load the buttons glide open and
// shut, a soft breeze ripples out of the toggle, then flows across the logo as a shine and sparkles
// (no press; the logo only presses in when it's tapped).
// On computers the buttons sit in the sidebar and always show.
export function DashTopNav({ admin, actions }: { admin: boolean; actions: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  // "glint" = shine and sparkles only (after a page opens); "tap" also presses the logo in.
  const [pop, setPop] = useState<false | "glint" | "tap">(false);
  // The toggle's arrow always turns counter-clockwise, half a turn each time the buttons open or close.
  const [spin, setSpin] = useState(0);
  const lastOpen = useRef(false);
  const [phone, setPhone] = useState(true);
  const timers = useRef<number[]>([]);

  const stopIntro = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShake(false);
  };

  useEffect(() => {
    if (lastOpen.current === open) return;
    lastOpen.current = open;
    setSpin((d) => d - 180);
  }, [open]);

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
    // The first dashboard page after signing in (this browser session) keeps the buttons open for
    // WELCOME_MS, so new visitors see everything. Tapping a page button or the toggle ends that early.
    let welcome = false;
    try {
      if (!sessionStorage.getItem(WELCOME_KEY)) {
        sessionStorage.setItem(WELCOME_KEY, "1");
        welcome = true;
      }
    } catch {}
    const foldAt = welcome ? WELCOME_MS : 50 + SHOW_MS;
    const breezeAt = foldAt + BREEZE_AFTER_FOLD;
    const popAt = breezeAt + POP_AFTER_BREEZE;
    later(() => setOpen(true), 50);
    later(() => setOpen(false), foldAt);
    if (!still) {
      later(() => setShake(true), breezeAt);
      later(() => setShake(false), breezeAt + BREEZE_MS);
      later(() => setPop("glint"), popAt);
      later(() => setPop(false), popAt + POP_MS);
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
        setPop("tap");
        timers.current.push(window.setTimeout(() => setPop(false), POP_MS));
      }),
    );
  }

  return (
    <>
      <div className="flex items-center justify-between md:mb-6 md:block">
        <div className={`relative ${pop === "tap" ? "dash-pop" : pop === "glint" ? "dash-glint" : ""}`}>
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
          {DUST.map((d, i) => (
            <span key={i} aria-hidden="true" className={`dash-dust${d.star ? " star" : ""}`} style={d.style}>
              {d.star ? "✦" : null}
            </span>
          ))}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="dash-nav"
            aria-label={open ? "Hide page buttons" : "Show page buttons"}
            title={open ? "Hide page buttons" : "Show page buttons"}
            className={`absolute -bottom-3 -left-3 z-[1] grid h-5 w-5 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm md:hidden ${shake ? "dash-breeze" : ""}`}
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 transition-[rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ rotate: `${spin}deg` }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </button>
        </div>
        {actions}
      </div>
      <div
        id="dash-nav"
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:grid-rows-[1fr] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className={`min-h-0 overflow-hidden transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-0 md:opacity-100 ${open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`} inert={phone && !open ? true : undefined}>
          <div className="pt-3 md:pt-0">
            <DashNav admin={admin} />
          </div>
        </div>
      </div>
    </>
  );
}
