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

const GLINT_AFTER_MS = 400;
const POP_MS = 1100;
const FOLDED_KEY = "tapshop-nav-folded";
// Every 30 s (while the page buttons are folded) a gold shine sweeps the logo, then its label
// rolls like a slot machine to "Tap here for menu" for 5 s and rolls back.
const HINT_EVERY_MS = 30_000;
const HINT_SHINE_MS = 1000;
const HINT_HOLD_MS = 5000;

// The dashboard header, on phones and computers alike: a glossy 3D logo button, a small toggle on its lower-left corner, and the page buttons.
// The buttons stay open; tapping the logo or the toggle folds or shows them, and that choice is remembered.
// Each page load gives the logo a shine and sparkles (no press; the logo only presses in when it's tapped).
export function DashTopNav({ admin, actions }: { admin: boolean; actions: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(true);
  const [shake, setShake] = useState(false);
  // "glint" = shine and sparkles only (after a page opens); "tap" also presses the logo in.
  const [pop, setPop] = useState<false | "glint" | "tap">(false);
  // The toggle's arrow always turns counter-clockwise, half a turn each time the buttons open or close.
  const [spin, setSpin] = useState(-180);
  const lastOpen = useRef(true);
  const [gold, setGold] = useState(false);
  const [hint, setHint] = useState(false);
  // The logo keeps the width of "TapShop"; the hint is drawn in a smaller font so it fits that width.
  const [label, setLabel] = useState<{ w: number; alt: number } | null>(null);
  const labelA = useRef<HTMLSpanElement>(null);
  const labelB = useRef<HTMLSpanElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
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

  // The page buttons stay open unless the creator folds them; that choice is remembered on this device.
  useEffect(() => {
    try {
      if (localStorage.getItem(FOLDED_KEY) === "1") setOpen(false);
    } catch {}
  }, []);

  // A page opening gives the logo its shine and sparkles; the buttons don't move.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids: number[] = [];
    timers.current = ids;
    ids.push(window.setTimeout(() => setPop("glint"), GLINT_AFTER_MS));
    ids.push(window.setTimeout(() => setPop(false), GLINT_AFTER_MS + POP_MS));
    return () => {
      ids.forEach(clearTimeout);
      setPop(false);
    };
  }, [path]);

  // Measure both labels once fonts load: the hint's font size is set so it's exactly as wide as "TapShop".
  useEffect(() => {
    const measure = () => {
      const a = labelA.current, b = labelB.current;
      if (!a || !b) return;
      const base = parseFloat(getComputedStyle(a).fontSize), now = parseFloat(getComputedStyle(b).fontSize);
      const perEm = b.scrollWidth / (now / base);
      if (perEm > 0) setLabel({ w: a.scrollWidth, alt: Math.min(0.74, (a.scrollWidth * 0.98) / perEm) });
    };
    measure();
    document.fonts?.ready.then(measure);
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids: number[] = [];
    const every = window.setInterval(() => {
      if (openRef.current || document.hidden) return;
      setGold(true);
      ids.push(window.setTimeout(() => setGold(false), HINT_SHINE_MS));
      ids.push(window.setTimeout(() => setHint(true), HINT_SHINE_MS - 100));
      ids.push(window.setTimeout(() => setHint(false), HINT_SHINE_MS - 100 + HINT_HOLD_MS));
    }, HINT_EVERY_MS);
    return () => {
      clearInterval(every);
      ids.forEach(clearTimeout);
      setGold(false);
      setHint(false);
    };
  }, []);

  function toggle() {
    stopIntro();
    setOpen((o) => {
      try {
        localStorage.setItem(FOLDED_KEY, o ? "1" : "0");
      } catch {}
      return !o;
    });
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
      <div className="flex items-center justify-between">
        <div className={`relative ${pop === "tap" ? "dash-pop" : pop === "glint" ? "dash-glint" : ""}`}>
          <Link
            href="/dashboard"
            className={`dash-logo${gold ? " dash-gold" : ""}`}
            aria-label="TapShop, tap for the menu"
            onClick={(e) => {
              // The logo is the big button for the page buttons.
              e.preventDefault();
              toggle();
              sparkle();
            }}
          >
            <span
              className={`dash-slot${hint ? " alt" : ""}`}
              style={{ width: label ? `${label.w}px` : "4.15em", ...(label ? { "--alt": label.alt } : {}) } as React.CSSProperties}
              aria-hidden="true"
            >
              <span className="dash-slot-reel">
                <span ref={labelA}>TapShop</span>
                <span ref={labelB} className="dash-slot-alt">Tap here for menu</span>
              </span>
            </span>
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
            className={`absolute -bottom-3 -left-3 z-[1] grid h-5 w-5 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm ${shake ? "dash-breeze" : ""}`}
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
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className={`min-h-0 overflow-hidden transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`} inert={!open ? true : undefined}>
          <div className="pt-3">
            <DashNav admin={admin} />
          </div>
        </div>
      </div>
    </>
  );
}
