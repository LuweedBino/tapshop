import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { requireCreator } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serves the original studio files from vendor/tapshop-studio. They live outside public/
// so the editor HTML and assets are only reachable with a creator session.
const ROOT = resolve(process.cwd(), "vendor/tapshop-studio");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff": "font/woff",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
};

const FILES = new Set([
  "index.html",
  "video.html",
  "video.js",
  "panel-layout.js",
  "timeline-strips.js",
  "text-catalog.js",
  "text-fonts.css",
  "demo.webm",
]);

function allowed(path: string[]) {
  if (path.length === 1) return FILES.has(path[0]);
  return (
    path.length === 2 &&
    path[0] === "fonts" &&
    (/^ts-font-(?:[0-9]|1[0-9]|2[0-5])\.woff$/.test(path[1]) ||
      path[1] === "DejaVu-LICENSE.txt" ||
      path[1] === "LatinModern-LICENSE.txt")
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  await requireCreator();
  const { path } = await params;
  if (!allowed(path)) return new Response("Not found", { status: 404 });
  const file = resolve(ROOT, ...path);
  if (!file.startsWith(ROOT + sep)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}
