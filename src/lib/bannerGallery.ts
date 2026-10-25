// Ready-made banners, drawn as SVG so they stay sharp, weigh a few KB and need no
// image hosting. "Your color" designs are drawn from the creator's accent color.

type Draw = (accent: string) => string;
export type BannerPreset = { label: string; group: "Your color" | "Gradients" | "Scenes" | "Patterns"; draw: Draw };

const W = 1200;
const H = 600;
const svg = (body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
const rect = (fill: string) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
const linear = (id: string, stops: string[], x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>`;
const blur = (id: string, sd: number) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

// Mixes a hex color toward white (amt > 0) or black (amt < 0).
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const t = amt > 0 ? 255 : 0;
  const p = Math.abs(amt);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * p));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Rotates the hue of a hex color, for a matching second color.
function hue(hex: string, deg: number) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// Small seeded random so starfields and confetti look the same on every render.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const waves = (colors: string[], base: number, amp: number) =>
  colors
    .map((c, i) => {
      const y = base + i * 70;
      const a = amp * (i % 2 ? -1 : 1);
      return `<path d="M0 ${y} C300 ${y - a} 500 ${y + a} 800 ${y} S1100 ${y - a} 1200 ${y} V600 H0Z" fill="${c}"/>`;
    })
    .join("");

const mountains = (colors: string[]) =>
  colors
    .map((c, i) => {
      const r = rng(7 + i * 13);
      const base = 300 + i * 80;
      let d = `M0 ${base}`;
      for (let x = 0; x <= W; x += 150) d += ` L${x + 75} ${base - 60 - r() * 120} L${x + 150} ${base - r() * 40}`;
      return `<path d="${d} V600 H0Z" fill="${c}"/>`;
    })
    .join("");

const stars = (n: number, seed: number, maxY = H) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * maxY).toFixed(0)}" r="${(0.6 + r() * 1.8).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join("");
};

export const BANNER_PRESETS = {
  glow: {
    label: "Glow",
    group: "Your color",
    draw: (a) =>
      svg(
        rect(shade(a, -0.35)) + `<g filter="url(#b)"><circle cx="250" cy="150" r="260" fill="${a}"/><circle cx="900" cy="450" r="300" fill="${hue(a, 40)}"/><circle cx="700" cy="80" r="180" fill="${shade(a, 0.4)}"/></g>`,
        blur("b", 90),
      ),
  },
  colorWaves: {
    label: "Waves",
    group: "Your color",
    draw: (a) => svg(rect(shade(a, 0.75)) + waves([shade(a, 0.5), shade(a, 0.25), a, shade(a, -0.25)], 250, 70)),
  },
  blobs: {
    label: "Blobs",
    group: "Your color",
    draw: (a) =>
      svg(
        rect(shade(a, 0.85)) +
          `<g filter="url(#b)" opacity="0.9"><ellipse cx="200" cy="420" rx="260" ry="200" fill="${a}"/><ellipse cx="650" cy="120" rx="300" ry="170" fill="${hue(a, -50)}"/><ellipse cx="1050" cy="420" rx="240" ry="220" fill="${hue(a, 60)}"/></g>`,
        blur("b", 60),
      ),
  },
  prism: {
    label: "Prism",
    group: "Your color",
    draw: (a) => {
      const r = rng(42);
      let tris = "";
      const step = 150;
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step) {
          const tone = () => shade(a, (r() - 0.5) * 0.7);
          tris += `<path d="M${x} ${y}H${x + step}V${y + step}Z" fill="${tone()}"/><path d="M${x} ${y}V${y + step}H${x + step}Z" fill="${tone()}"/>`;
        }
      return svg(tris);
    },
  },
  halftone: {
    label: "Halftone",
    group: "Your color",
    draw: (a) => {
      let dots = "";
      for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) dots += `<circle cx="${x}" cy="${y}" r="${(2 + (x / W) * 12).toFixed(1)}" fill="${shade(a, 0.35)}"/>`;
      return svg(rect(a) + dots);
    },
  },
  contours: {
    label: "Contours",
    group: "Your color",
    draw: (a) => {
      let rings = "";
      for (let i = 1; i <= 14; i++) {
        const rx = i * 60, ry = i * 38;
        rings += `<path d="M${600 - rx} 300 C${600 - rx} ${300 - ry * 1.2} ${600 + rx * 0.6} ${300 - ry} ${600 + rx} ${300 - ry * 0.2} S${600 + rx * 0.4} ${300 + ry * 1.1} ${600 - rx} 300Z" fill="none" stroke="${shade(a, 0.45)}" stroke-width="2.5" opacity="0.8"/>`;
      }
      return svg(rect(shade(a, -0.15)) + rings);
    },
  },
  sunset: { label: "Sunset", group: "Gradients", draw: () => svg(rect("url(#g)"), linear("g", ["#ff9a44", "#fc6076", "#7b2ff7"])) },
  ocean: { label: "Ocean", group: "Gradients", draw: () => svg(rect("url(#g)"), linear("g", ["#43e97b", "#38f9d7", "#2b6cb0"], 1, 0)) },
  aurora: {
    label: "Aurora",
    group: "Gradients",
    draw: () =>
      svg(
        rect("#0b1026") + `<g filter="url(#b)"><ellipse cx="350" cy="220" rx="380" ry="90" fill="#22d3a6" transform="rotate(-12 350 220)"/><ellipse cx="850" cy="300" rx="380" ry="100" fill="#8b5cf6" transform="rotate(10 850 300)"/></g>` + stars(60, 3),
        blur("b", 60),
      ),
  },
  peach: { label: "Peach", group: "Gradients", draw: () => svg(rect("url(#g)"), linear("g", ["#ffecd2", "#fcb69f"])) },
  pastel: { label: "Pastel", group: "Gradients", draw: () => svg(rect("url(#g)"), linear("g", ["#a1ffce", "#c2e9fb", "#e0c3fc"], 1, 0.3)) },
  noir: {
    label: "Noir",
    group: "Gradients",
    draw: () => svg(rect("#0a0a0a") + `<ellipse cx="900" cy="80" rx="500" ry="260" fill="#525252" filter="url(#b)" opacity="0.7"/>`, blur("b", 100)),
  },
  mountains: {
    label: "Mountains",
    group: "Scenes",
    draw: () => svg(rect("url(#g)") + `<circle cx="820" cy="250" r="70" fill="#fff4d6"/>` + mountains(["#9b8bd4", "#6c5ba7", "#463a7a", "#2a2250"]), linear("g", ["#ffd1a1", "#f7a8b8", "#c3a6e8"], 0, 1)),
  },
  sea: {
    label: "Sea",
    group: "Scenes",
    draw: () =>
      svg(
        `<rect width="${W}" height="380" fill="url(#g)"/>` +
          `<circle cx="600" cy="370" r="110" fill="#ffd36e"/><rect y="370" width="${W}" height="230" fill="url(#s)"/>` +
          [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${560 - i * 12}" y="${390 + i * 30}" width="${80 + i * 24}" height="5" rx="2.5" fill="#ffd36e" opacity="${0.8 - i * 0.12}"/>`).join(""),
        linear("g", ["#4a3a8c", "#e8587a", "#ff9f5a"], 0, 1) + linear("s", ["#3a3a7c", "#1d2350"], 0, 1),
      ),
  },
  night: {
    label: "Night sky",
    group: "Scenes",
    draw: () =>
      svg(
        rect("url(#g)") + stars(140, 11, 420) + `<circle cx="950" cy="130" r="55" fill="#f5f3ce"/><circle cx="975" cy="115" r="50" fill="#141a3d"/>` + waves(["#1b2350", "#121838"], 470, 40),
        linear("g", ["#0b0f2b", "#2b2d6e"], 0, 1),
      ),
  },
  dunes: {
    label: "Dunes",
    group: "Scenes",
    draw: () => svg(rect("url(#g)") + `<circle cx="300" cy="200" r="60" fill="#fff3c4"/>` + waves(["#f4c27a", "#e9a15a", "#d9813f", "#b8622b"], 330, 60), linear("g", ["#ffe5b4", "#ffc28a"], 0, 1)),
  },
  clouds: {
    label: "Clouds",
    group: "Scenes",
    draw: () => {
      const cloud = (x: number, y: number, s: number) =>
        `<g fill="#fff" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="50"/><circle cx="55" cy="-25" r="65"/><circle cx="120" cy="0" r="50"/><rect x="0" y="0" width="120" height="50"/></g>`;
      return svg(rect("url(#g)") + `<g opacity="0.95">${cloud(120, 200, 1)}${cloud(620, 140, 0.8)}${cloud(900, 380, 1.2)}${cloud(380, 430, 0.7)}</g>`, linear("g", ["#5aa9ff", "#bfe3ff"], 0, 1));
    },
  },
  forest: {
    label: "Forest",
    group: "Scenes",
    draw: () => {
      const trees = (y: number, color: string, seed: number, size: number) => {
        const r = rng(seed);
        let t = "";
        for (let x = -20; x < W + 40; x += size * 0.7 + r() * size * 0.5) {
          const h = size * (1.6 + r() * 1.2);
          t += `<path d="M${x} ${y - h} L${x + size / 2} ${y} H${x - size / 2}Z" fill="${color}"/>`;
        }
        return t + `<rect y="${y}" width="${W}" height="${H - y}" fill="${color}"/>`;
      };
      return svg(rect("url(#g)") + trees(380, "#7fa59a", 5, 70) + trees(470, "#4d7a6c", 9, 90) + trees(580, "#24443b", 13, 110), linear("g", ["#e3efe9", "#b9d6cb"], 0, 1));
    },
  },
  confetti: {
    label: "Confetti",
    group: "Patterns",
    draw: () => {
      const r = rng(21);
      const colors = ["#ff5a5f", "#ffb400", "#00a699", "#7b61ff", "#ff7ac6"];
      let bits = "";
      for (let i = 0; i < 90; i++) {
        const x = r() * W, y = r() * H, c = colors[i % colors.length], rot = r() * 180;
        bits += i % 3 === 0 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(5 + r() * 6).toFixed(0)}" fill="${c}"/>` : `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(10 + r() * 14).toFixed(0)}" height="7" rx="3" fill="${c}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
      }
      return svg(rect("#fff8ef") + bits);
    },
  },
  neonGrid: {
    label: "Neon grid",
    group: "Patterns",
    draw: () => {
      let lines = "";
      for (let x = -1200; x <= 2400; x += 120) lines += `<line x1="600" y1="300" x2="${x}" y2="600" stroke="#ff4fd8" stroke-width="2" opacity="0.7"/>`;
      for (let i = 0; i < 8; i++) {
        const y = 300 + Math.pow(i / 8, 2) * 300;
        lines += `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="#ff4fd8" stroke-width="2" opacity="0.7"/>`;
      }
      return svg(rect("url(#g)") + `<circle cx="600" cy="250" r="120" fill="url(#s)"/>` + `<rect y="300" width="${W}" height="300" fill="#12002b"/>` + lines, linear("g", ["#12002b", "#5b0f7a"], 0, 1) + linear("s", ["#ffe66d", "#ff3f8e"], 0, 1));
    },
  },
  stripes: {
    label: "Stripes",
    group: "Patterns",
    draw: () => {
      const colors = ["#ffd166", "#ef476f", "#118ab2", "#06d6a0"];
      let s = "";
      for (let i = -10; i < 30; i++) s += `<path d="M${i * 80} 0 h80 l-600 600 h-80Z" fill="${colors[(i + 10) % 4]}"/>`;
      return svg(rect("#fff") + s);
    },
  },
  terrazzo: {
    label: "Terrazzo",
    group: "Patterns",
    draw: () => {
      const r = rng(77);
      const colors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261"];
      let chips = "";
      for (let i = 0; i < 120; i++) {
        const x = r() * W, y = r() * H, s = 14 + r() * 26;
        chips += `<path d="M${x} ${y} l${s} ${s * 0.3} l${-s * 0.4} ${s} Z" fill="${colors[i % colors.length]}"/>`;
      }
      return svg(rect("#f3ede4") + chips);
    },
  },
} satisfies Record<string, BannerPreset>;

export type BannerPresetId = keyof typeof BANNER_PRESETS;
export const BANNER_GROUPS = [...new Set(Object.values(BANNER_PRESETS).map((p) => p.group))];

export function isBannerPreset(v: unknown): v is BannerPresetId {
  return typeof v === "string" && Object.hasOwn(BANNER_PRESETS, v);
}

export function bannerPresetSrc(id: BannerPresetId, accent: string) {
  const a = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#7c3aed";
  return `data:image/svg+xml,${encodeURIComponent(BANNER_PRESETS[id].draw(a))}`;
}
