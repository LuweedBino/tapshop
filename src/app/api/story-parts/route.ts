import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { getCreator } from "@/lib/auth";
import { getGemini, streamGeminiJson } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The B-roll Video Maker's "understand what was said": the words of the creator's long talking clips (written
// down on their phone, with word numbers) and the story templates in; which story they're telling and which
// words belong to each of its parts out, plus a short on-screen title per part. Only words are sent, never
// sound or video. The phone keeps its own word-spotting as the fallback, so any failure here is harmless.
// Streams NDJSON like /api/edit-script.

type Story = { id: string; name: string; parts: { id: string; label: string }[] };
type Clip = { n: number; words: string[] };

const SYSTEM_INSTRUCTION = `You help edit short UGC videos. A creator filmed themselves talking; you get the words they said (each word numbered, per clip) and a list of story templates, each with its parts in order.
- Pick the story the creator is actually telling (if only one story is given, use it). Judge by meaning, not keywords: "it fits in my car's cup holder" is a reason even with no number word.
- Split each clip's words into segments, one per story part, in time order. Parts must follow the template's order; each part appears at most once per clip; a part may be skipped if the creator never says it.
- Start a new part exactly at the word where the new point begins, even in the middle of a sentence (e.g. "…cup holder and three, it has…" starts the next part at "and").
- Segments use inclusive word numbers ("from", "to"), ascending and not overlapping. Cover every word that belongs to the story. Leave out only obvious false starts, repeated retakes of the same line, and off-topic chatter.
- title: the words to show on screen for that part, at most 6 words, taken from what the creator said (shortened is fine), no emoji, no claims they didn't make.
- Respond only with JSON matching the schema.`;

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function readStories(v: unknown): Story[] | null {
  if (!Array.isArray(v) || !v.length || v.length > 20) return null;
  const out: Story[] = [];
  for (const s of v) {
    const x = (s ?? {}) as Record<string, unknown>;
    const id = str(x.id, 40);
    const parts = (Array.isArray(x.parts) ? (x.parts as unknown[]) : [])
      .map((p) => (p ?? {}) as Record<string, unknown>)
      .map((p) => ({ id: str(p.id, 40), label: str(p.label, 60) }))
      .filter((p) => p.id)
      .slice(0, 12);
    if (!id || !parts.length) return null;
    out.push({ id, name: str(x.name, 80) || id, parts });
  }
  return out;
}

function readClips(v: unknown): Clip[] | null {
  if (!Array.isArray(v) || !v.length || v.length > 6) return null;
  const out: Clip[] = [];
  let total = 0;
  for (const c of v) {
    const x = (c ?? {}) as Record<string, unknown>;
    const words = (Array.isArray(x.words) ? (x.words as unknown[]) : []).map((w) => str(w, 40)).slice(0, 2000);
    total += words.length;
    if (!words.length || total > 3000) return null;
    out.push({ n: Math.round(Number(x.n)) || 0, words });
  }
  return out;
}

export async function POST(req: Request) {
  if (!(await getCreator())) return fail(401, "Please sign in.");
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Invalid JSON body.");
  }
  const stories = readStories(body.stories);
  const clips = readClips(body.clips);
  if (!stories || !clips) return fail(400, "Nothing to read yet.");
  const ai = getGemini();
  if (!ai) return fail(500, "The AI is not configured.");

  const contents = [
    "Story templates:",
    ...stories.map((s) => `- ${s.id} (${s.name}): ${s.parts.map((p) => `${p.id} = ${p.label}`).join(", ")}`),
    "",
    ...clips.map((c) => `Clip ${c.n}: ${c.words.map((w, i) => `[${i}]${w}`).join(" ")}`),
  ].join("\n");

  const ids = stories.map((s) => s.id);
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      story: { type: Type.STRING, enum: ids },
      clips: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            n: { type: Type.INTEGER },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { part: { type: Type.STRING }, from: { type: Type.INTEGER }, to: { type: Type.INTEGER }, title: { type: Type.STRING } },
                required: ["part", "from", "to", "title"],
                propertyOrdering: ["part", "from", "to", "title"],
              },
            },
          },
          required: ["n", "segments"],
          propertyOrdering: ["n", "segments"],
        },
      },
    },
    required: ["story", "clips"],
    propertyOrdering: ["story", "clips"],
  };

  return streamGeminiJson({
    tag: "story-parts",
    ai,
    contents,
    systemInstruction: SYSTEM_INSTRUCTION,
    schema,
    what: "read your clip",
    finish: (parsed) => {
      const r = (parsed ?? {}) as Record<string, unknown>;
      const story = stories.find((s) => s.id === r.story) ?? (stories.length === 1 ? stories[0] : null);
      if (!story) return { ok: false, error: "The AI didn't pick a story." };
      const order = new Map(story.parts.map((p, i) => [p.id, i]));
      const out = clips.map((c) => {
        const got = (Array.isArray(r.clips) ? (r.clips as unknown[]) : [])
          .map((x) => (x ?? {}) as Record<string, unknown>)
          .find((x) => Math.round(Number(x.n)) === c.n);
        const raw: unknown[] = got && Array.isArray(got.segments) ? (got.segments as unknown[]) : [];
        let lastTo = -1;
        let lastPart = -1;
        const segments: { part: string; from: number; to: number; title: string }[] = [];
        for (const s of raw.map((x) => (x ?? {}) as Record<string, unknown>)) {
          const part = str(s.part, 40);
          const k = order.get(part);
          const from = Math.round(Number(s.from));
          const to = Math.round(Number(s.to));
          // Keep only segments that are in order and inside the clip; anything odd is dropped, not guessed.
          if (k === undefined || k <= lastPart || !(from > lastTo) || !(to >= from) || to >= c.words.length) continue;
          segments.push({ part, from, to, title: str(s.title, 60) });
          lastTo = to;
          lastPart = k;
        }
        return { n: c.n, segments };
      });
      if (!out.some((c) => c.segments.length >= 2)) return { ok: false, error: "The AI couldn't split the clip." };
      return { ok: true, story: story.id, clips: out };
    },
  });
}

export function GET() {
  return fail(405, "Method not allowed. Use POST.");
}
