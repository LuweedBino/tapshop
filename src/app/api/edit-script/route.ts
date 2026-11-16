import { NextResponse } from "next/server";
import { Type, type Schema } from "@google/genai";
import { getCreator } from "@/lib/auth";
import { getGemini, streamGeminiJson } from "@/lib/gemini";
import { SECTION_TYPES, TONES } from "@/types/script";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Build My Video With AI's "💬 Change my script" and "↻ 3 new hooks": the creator's current script plus a
// plain-English request in, the changed script out (same shape as /api/generate-script, plus a one-line
// summary of what changed). Streams NDJSON like generate-script.

type Scene = { sectionType: string; durationSeconds: number; visualDirection: string; voiceoverLine: string; onScreenText: string };

const SYSTEM_INSTRUCTION = `You edit short UGC video scripts for creators. You get the current script (as JSON) and the creator's request.
- Change only what the request asks for; keep every other scene's words as they are.
- Keep the creator's voice: first person, casual, contractions, short sentences. Never sound like an ad. Banned: "game-changer", "revolutionary", "elevate", "unlock", "seamless", "must-have".
- Never invent claims, statistics, reviews or prices that aren't already in the script or the product details.
- Scene 1 stays the Hook (≤3 s) and the last scene stays the CTA, unless the request says otherwise.
- Voiceover lines must be speakable in their scene's seconds (~2.5 words per second). onScreenText stays short (≤ ~8 words).
- hookVariations: exactly 3 opening lines with different angles (curiosity, pain call-out, bold claim); each can replace scene 1's voiceover. When asked for new hooks, make all 3 fresh and different from the current ones and from scene 1.
- changeSummary: one short, friendly sentence telling the creator what you changed.
- Respond only with JSON matching the schema.`;

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    changeSummary: { type: Type.STRING },
    title: { type: Type.STRING },
    hookVariations: { type: Type.ARRAY, items: { type: Type.STRING } },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionType: { type: Type.STRING, enum: [...SECTION_TYPES] },
          durationSeconds: { type: Type.INTEGER },
          visualDirection: { type: Type.STRING },
          voiceoverLine: { type: Type.STRING },
          onScreenText: { type: Type.STRING },
        },
        required: ["sectionType", "durationSeconds", "visualDirection", "voiceoverLine", "onScreenText"],
        propertyOrdering: ["sectionType", "durationSeconds", "visualDirection", "voiceoverLine", "onScreenText"],
      },
    },
  },
  required: ["changeSummary", "title", "hookVariations", "scenes"],
  propertyOrdering: ["changeSummary", "title", "hookVariations", "scenes"],
};

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function readScenes(v: unknown): Scene[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 20) return null;
  const out: Scene[] = [];
  for (const s of v) {
    if (!s || typeof s !== "object") return null;
    const x = s as Record<string, unknown>;
    out.push({
      sectionType: SECTION_TYPES.includes(x.sectionType as never) ? String(x.sectionType) : "Demo/Solution",
      durationSeconds: Math.max(1, Math.min(60, Math.round(Number(x.durationSeconds) || 3))),
      visualDirection: str(x.visualDirection, 400),
      voiceoverLine: str(x.voiceoverLine, 400),
      onScreenText: str(x.onScreenText, 120),
    });
  }
  return out;
}

export async function POST(req: Request) {
  if (!(await getCreator())) return fail(401, "Please sign in to change your script.");
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Invalid JSON body.");
  }
  const mode = body.mode === "hooks" ? "hooks" : "edit";
  const request = str(body.request, 500);
  const scenes = readScenes(body.scenes);
  if (!scenes) return fail(400, "There's no script to change yet.");
  if (mode === "edit" && !request) return fail(400, "Type what you'd like to change.");
  const ai = getGemini();
  if (!ai) return fail(500, "The script AI is not configured. Please try again later.");

  const tone = TONES.includes(body.tone as never) ? String(body.tone) : "";
  const contents = [
    `Product: ${str(body.product, 120) || "not given"}`,
    `Product details (only claim what's here): ${str(body.benefits, 1500) || "not given"}`,
    ...(tone ? [`Tone: ${tone}`] : []),
    `Current hooks: ${JSON.stringify(Array.isArray(body.hooks) ? body.hooks.map((h) => str(h, 300)).filter(Boolean).slice(0, 4) : [])}`,
    `Current script: ${JSON.stringify({ title: str(body.title, 120), scenes })}`,
    "",
    mode === "hooks"
      ? "Request: write 3 brand-new hookVariations with different angles from the current ones. Keep every scene exactly as it is."
      : `Request: ${request}`,
  ].join("\n");

  return streamGeminiJson({
    tag: "edit-script",
    ai,
    contents,
    systemInstruction: SYSTEM_INSTRUCTION,
    schema: SCHEMA,
    what: "change the script",
    finish: (parsed) => {
      const r = (parsed ?? {}) as Record<string, unknown>;
      const next = readScenes(r.scenes);
      if (!next) return { ok: false, error: "The AI returned an incomplete script. Please try again." };
      const hooks = (Array.isArray(r.hookVariations) ? r.hookVariations : []).map((h) => str(h, 300)).filter(Boolean).slice(0, 3);
      return {
        ok: true,
        summary: str(r.changeSummary, 240) || "Done.",
        script: { title: str(r.title, 120) || str(body.title, 120), hookVariations: hooks, scenes: next },
      };
    },
  });
}

export function GET() {
  return fail(405, "Method not allowed. Use POST.");
}
