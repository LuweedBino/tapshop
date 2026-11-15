import { NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai";
import { getCreator } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  DURATIONS,
  FRAMEWORKS,
  SECTION_TYPES,
  TONES,
  type GenerateScriptRequest,
  type GenerateScriptResponse,
  type GeneratedUGCScript,
  type ScriptScene,
} from "@/types/script";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Long scripts with Gemini 3 can take over a minute; the reply streams, so the connection stays busy.
export const maxDuration = 300;

// Google retires models often and new API keys can't use older ones, so try these in order and
// move on when one answers 404. GEMINI_MODEL (optional) goes first.
const MODELS = [...new Set([env.geminiModel, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest"].filter(Boolean))];
const MAX_FIELD_LENGTH = { productName: 120, keyBenefits: 1500, targetAudience: 400 } as const;

// ---------------------------------------------------------------------------
// System instruction
// ---------------------------------------------------------------------------
const SYSTEM_INSTRUCTION = `You are an elite direct-response UGC scriptwriter. You have written thousands of top-performing scripts for TikTok Shop, Instagram Reels, and YouTube Shorts, and you know exactly what makes people stop scrolling and buy.

VOICE
- Write like a real person talking into their phone camera: first person, contractions, short sentences, natural pauses, the occasional "okay so" or "honestly".
- Never sound like an ad. Banned: "game-changer", "revolutionary", "elevate", "unlock", "seamless", "must-have", "look no further", "in today's fast-paced world", and any corporate fluff.
- Be specific and sensory. Concrete details beat adjectives ("it dried in like 40 seconds" beats "it dries fast").
- Never invent claims, statistics, certifications, reviews, or prices that were not provided. Social proof should be the creator's own experience or generic, honest framing ("my sister stole mine").

STRUCTURE
- Scene 1 MUST be a "Hook" that lands in the first 3 seconds (durationSeconds <= 3). It must create curiosity, call out the viewer, or show a surprising visual. No intros, no "hey guys".
- The final scene MUST be a "CTA" that is natural and specific (e.g. "tap the orange cart", "link's in my bio") — not pushy.
- Scene durations must add up to the requested total duration (within ±2 seconds).
- Voiceover lines must be speakable in their scene duration (~2.5 words per second max).
- onScreenText is a short caption overlay (max ~8 words). Use an empty string if none is needed.
- visualDirection tells the creator exactly what to film: framing, action, b-roll, and product placement.

FRAMEWORKS
- PAS: Hook → Problem (name the pain) → Problem/agitate (why it's worse than they think) → Demo/Solution → optional Social Proof → CTA.
- 3_REASONS: Hook ("3 reasons I'm obsessed with…") → three Demo/Solution scenes, one reason each → CTA.
- SKEPTIC_UNBOXING: Hook (admit doubt) → unboxing/first impression as Problem or Demo → Demo/Solution (the moment it wins them over) → Social Proof (honest verdict) → CTA.
- TIKTOK_SHOP_HOOK: Pattern-interrupt Hook → quick Demo/Solution → value/urgency framing → CTA pointing to the orange cart / TikTok Shop.

TONES
- "Casual & Authentic": chill, friend-on-FaceTime energy.
- "High Energy": fast cuts, excited delivery, punchy lines.
- "ASMR / Calm": soft-spoken, slow, emphasis on sounds and textures; visual direction should call out close-up sounds.
- "Storytime": narrative arc, personal anecdote, "so this happened…".

OUTPUT
- Provide exactly 3 hookVariations: each a different angle (e.g. curiosity, pain call-out, bold claim/visual) for A/B testing. Each must work as a drop-in replacement for scene 1's voiceover.
- Respond only with JSON matching the provided schema.`;

// ---------------------------------------------------------------------------
// Structured Output schema (mirrors GeneratedUGCScript)
// ---------------------------------------------------------------------------
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short internal title for this script." },
    hookVariations: {
      type: Type.ARRAY,
      description: "Exactly 3 alternative opening hook lines for A/B testing.",
      items: { type: Type.STRING },
    },
    estimatedTotalSeconds: { type: Type.INTEGER, description: "Sum of all scene durations." },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          sectionType: { type: Type.STRING, enum: [...SECTION_TYPES] },
          durationSeconds: { type: Type.INTEGER },
          visualDirection: { type: Type.STRING },
          voiceoverLine: { type: Type.STRING },
          onScreenText: { type: Type.STRING },
        },
        required: [
          "sceneNumber",
          "sectionType",
          "durationSeconds",
          "visualDirection",
          "voiceoverLine",
          "onScreenText",
        ],
        propertyOrdering: [
          "sceneNumber",
          "sectionType",
          "durationSeconds",
          "visualDirection",
          "voiceoverLine",
          "onScreenText",
        ],
      },
    },
  },
  required: ["title", "hookVariations", "estimatedTotalSeconds", "scenes"],
  propertyOrdering: ["title", "hookVariations", "estimatedTotalSeconds", "scenes"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fail(status: number, error: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json<GenerateScriptResponse>({ ok: false, error, fieldErrors }, { status });
}

function validateBody(
  body: unknown,
): { data: GenerateScriptRequest } | { fieldErrors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!body || typeof body !== "object") return { fieldErrors: { body: "Request body must be a JSON object." } };
  const b = body as Record<string, unknown>;

  const str = (key: keyof typeof MAX_FIELD_LENGTH, required: boolean): string | undefined => {
    const v = b[key];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      if (required) errors[key] = `${key} is required.`;
      return undefined;
    }
    if (typeof v !== "string") {
      errors[key] = `${key} must be a string.`;
      return undefined;
    }
    const t = v.trim();
    if (t.length > MAX_FIELD_LENGTH[key]) errors[key] = `${key} must be ${MAX_FIELD_LENGTH[key]} characters or fewer.`;
    return t;
  };

  const productName = str("productName", true);
  const keyBenefits = str("keyBenefits", true);
  const targetAudience = str("targetAudience", false);

  const framework = b.framework;
  if (!FRAMEWORKS.includes(framework as never)) errors.framework = `framework must be one of: ${FRAMEWORKS.join(", ")}.`;

  const durationSeconds = typeof b.durationSeconds === "string" ? Number(b.durationSeconds) : b.durationSeconds;
  if (!DURATIONS.includes(durationSeconds as never)) errors.durationSeconds = `durationSeconds must be one of: ${DURATIONS.join(", ")}.`;

  const tone = b.tone;
  if (!TONES.includes(tone as never)) errors.tone = `tone must be one of: ${TONES.join(", ")}.`;

  if (Object.keys(errors).length) return { fieldErrors: errors };

  return {
    data: {
      productName: productName!,
      keyBenefits: keyBenefits!,
      targetAudience,
      framework: framework as GenerateScriptRequest["framework"],
      durationSeconds: durationSeconds as GenerateScriptRequest["durationSeconds"],
      tone: tone as GenerateScriptRequest["tone"],
    },
  };
}

function sceneGuidance(duration: number): string {
  if (duration === 15) return "3–4 scenes";
  if (duration === 30) return "4–6 scenes";
  return "6–9 scenes";
}

function buildPrompt(input: GenerateScriptRequest): string {
  return [
    `Write a ${input.durationSeconds}-second UGC video script.`,
    ``,
    `Product: ${input.productName}`,
    `Key benefits (from the brand — only claim what's here): ${input.keyBenefits}`,
    `Target audience: ${input.targetAudience || "Not specified — infer the most likely buyer from the product."}`,
    `Framework: ${input.framework}`,
    `Tone: ${input.tone}`,
    ``,
    `Use ${sceneGuidance(input.durationSeconds)}. Scene durations must total ${input.durationSeconds} seconds.`,
    `Scene 1 is the Hook (≤3s). Final scene is the CTA.`,
  ].join("\n");
}

/** Defensive check + cleanup so the client always gets a well-formed script. */
function normalizeScript(raw: unknown, target: number): GeneratedUGCScript | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.scenes) || r.scenes.length === 0) return null;

  const scenes: ScriptScene[] = [];
  for (const s of r.scenes) {
    if (!s || typeof s !== "object") return null;
    const sc = s as Record<string, unknown>;
    if (!SECTION_TYPES.includes(sc.sectionType as never)) return null;
    if (typeof sc.voiceoverLine !== "string" || typeof sc.visualDirection !== "string") return null;
    scenes.push({
      sceneNumber: 0,
      sectionType: sc.sectionType as ScriptScene["sectionType"],
      durationSeconds: Math.max(1, Math.round(Number(sc.durationSeconds) || 1)),
      visualDirection: sc.visualDirection.trim(),
      voiceoverLine: sc.voiceoverLine.trim(),
      onScreenText: typeof sc.onScreenText === "string" ? sc.onScreenText.trim() : "",
    });
  }
  scenes.forEach((s, i) => (s.sceneNumber = i + 1));

  const hooks = Array.isArray(r.hookVariations)
    ? r.hookVariations.filter((h): h is string => typeof h === "string" && h.trim() !== "").map((h) => h.trim())
    : [];
  // Guarantee exactly 3 hooks: trim extras, pad with scene 1's line if the model came up short.
  while (hooks.length < 3) hooks.push(scenes[0].voiceoverLine);
  hooks.length = 3;

  const total = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  return {
    title: typeof r.title === "string" && r.title.trim() ? r.title.trim() : "Untitled UGC Script",
    hookVariations: hooks,
    estimatedTotalSeconds: total || target,
    scenes,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const apiKey = env.geminiApiKey;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function POST(req: Request) {
  // Only signed-in creators, so nobody else can spend the Gemini quota.
  if (!(await getCreator())) return fail(401, "Please sign in to use the Script Writer.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON body.");
  }

  const result = validateBody(body);
  if ("fieldErrors" in result) return fail(400, "Please fix the highlighted fields.", result.fieldErrors);
  const input = result.data;

  const ai = getClient();
  if (!ai) {
    console.error("[generate-script] GEMINI_API_KEY is not set.");
    return fail(500, "Script generator is not configured. Please try again later.");
  }

  // Some API keys and regions reject the JSON schema with a 400; the same request without it
  // still returns JSON, and normalizeScript() checks its shape either way.
  // Sampling is left at the model's defaults (Gemini 3 is tuned for them); thinking is LOW for speed.
  // The answer streams back as NDJSON: "progress" lines while Gemini writes (and every few seconds
  // while it thinks, so phones and proxies don't drop a quiet connection), then one "result" line
  // shaped like GenerateScriptResponse. Validation errors above stay plain JSON.
  const deadline = Date.now() + 280_000;
  const call = (model: string, withSchema: boolean) =>
    ai.models.generateContentStream({
      model,
      contents: buildPrompt(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: RESPONSE_SCHEMA } : {}),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 8192,
        abortSignal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      },
    });

  const tryModel = async (model: string) => {
    try {
      return await call(model, true);
    } catch (err) {
      if ((err as { status?: number })?.status !== 400 || isKeyError(err)) throw err;
      console.warn(`[generate-script] ${model}: retrying without responseSchema:`, (err as Error)?.message);
      return await call(model, false);
    }
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let chars = 0;
      const send = (o: object) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const result = (r: GenerateScriptResponse) => send({ type: "result", ...r });
      send({ type: "progress", chars });
      const beat = setInterval(() => send({ type: "progress", chars }), 4_000);
      try {
        let gen: Awaited<ReturnType<typeof call>> | undefined;
        let lastErr: unknown;
        for (const model of MODELS) {
          try {
            gen = await tryModel(model);
            break;
          } catch (err) {
            lastErr = err;
            if ((err as { status?: number })?.status !== 404) throw err;
            console.warn(`[generate-script] ${model} not available, trying the next model.`);
          }
        }
        if (!gen) throw lastErr;

        let text = "";
        let finishReason: string | undefined;
        let sentAt = 0;
        for await (const chunk of gen) {
          text += chunk.text ?? "";
          chars = text.length;
          finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
          if (Date.now() - sentAt > 600) {
            send({ type: "progress", chars });
            sentAt = Date.now();
          }
        }

        if (!text) {
          console.error("[generate-script] Empty response. finishReason:", finishReason);
          return result({ ok: false, error: finishReason === "SAFETY"
            ? "The AI declined this request. Try rewording the product details."
            : "The AI returned an empty response. Please try again." });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
        } catch {
          console.error("[generate-script] Non-JSON response:", finishReason, text.slice(0, 500));
          return result({ ok: false, error: "The AI returned an unexpected format. Please try again." });
        }
        const script = normalizeScript(parsed, input.durationSeconds);
        result(script ? { ok: true, script } : { ok: false, error: "The AI returned an incomplete script. Please try again." });
      } catch (err: unknown) {
        const e = err as { status?: number; name?: string; message?: string };
        console.error("[generate-script] Gemini error:", e?.status, e?.name, e?.message);
        const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError" || Date.now() >= deadline;
        result({ ok: false, error: timedOut ? "The AI took too long this time. Please try again, or pick a shorter length." : explainGeminiError(err) });
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function isKeyError(err: unknown) {
  return /api[_ ]?key/i.test((err as Error)?.message ?? "");
}

// Turns Gemini's error into a plain sentence, so a bad key or quota problem says so on screen.
function explainGeminiError(err: unknown): string {
  const e = err as { status?: number; message?: string };
  const msg = e?.message ?? "";
  if (isKeyError(err)) return "Gemini says the API key isn't valid. Check GEMINI_API_KEY in Vercel, then redeploy.";
  if (e?.status === 403) return "Gemini refused the API key (no permission). Make a new key at aistudio.google.com/apikey.";
  if (e?.status === 404) return `None of these Gemini models are available for this API key: ${MODELS.join(", ")}. Set GEMINI_MODEL in Vercel to one that is.`;
  if (e?.status === 429) return "Gemini's usage limit was hit. Wait a minute and try again, or check your quota in Google AI Studio.";
  if (/location|region|not supported/i.test(msg)) return "Gemini isn't available from this server's region.";
  if (e?.status && e.status >= 500) return "Gemini is having trouble right now. Please try again in a minute.";
  const detail = msg.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? msg;
  return detail ? `Couldn't generate a script: ${detail.slice(0, 160)}` : "Couldn't generate a script right now. Please try again.";
}

export function GET() {
  return fail(405, "Method not allowed. Use POST.");
}
