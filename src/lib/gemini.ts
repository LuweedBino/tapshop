import { GoogleGenAI, ThinkingLevel, type Schema } from "@google/genai";
import { env } from "@/lib/env";

// Google retires models often and new API keys can't use older ones, so try these in order and
// move on when one answers 404. GEMINI_MODEL (optional) goes first.
// Flash-Lite first: script work needs speed more than deep reasoning.
export const GEMINI_MODELS = [
  ...new Set([env.geminiModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest"].filter(Boolean)),
] as string[];

let client: GoogleGenAI | null = null;
export function getGemini(): GoogleGenAI | null {
  const apiKey = env.geminiApiKey;
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function isKeyError(err: unknown) {
  return /api[_ ]?key/i.test((err as Error)?.message ?? "");
}

// Turns Gemini's error into a plain sentence, so a bad key or quota problem says so on screen.
export function explainGeminiError(err: unknown, what = "generate a script"): string {
  const e = err as { status?: number; message?: string };
  const msg = e?.message ?? "";
  if (isKeyError(err)) return "Gemini says the API key isn't valid. Check GEMINI_API_KEY in Vercel, then redeploy.";
  if (e?.status === 403) return "Gemini refused the API key (no permission). Make a new key at aistudio.google.com/apikey.";
  if (e?.status === 404) return `None of these Gemini models are available for this API key: ${GEMINI_MODELS.join(", ")}. Set GEMINI_MODEL in Vercel to one that is.`;
  if (e?.status === 429) return "Gemini's usage limit was hit. Wait a minute and try again, or check your quota in Google AI Studio.";
  if (/location|region|not supported/i.test(msg)) return "Gemini isn't available from this server's region.";
  if (isPassingGeminiError(err)) return "The AI got cut off before it finished. Please try again.";
  if (e?.status && e.status >= 500) return "Gemini is having trouble right now. Please try again in a minute.";
  const detail = msg.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? msg;
  return detail ? `Couldn't ${what}: ${detail.slice(0, 160)}` : `Couldn't ${what} right now. Please try again.`;
}

type Result = { ok: boolean; [k: string]: unknown };

/**
 * Asks Gemini for JSON and streams the answer back as NDJSON: "progress" lines while it writes (and
 * every 4 s while it thinks, so phones and proxies keep the connection), then one "result" line made
 * by `finish(parsed)`. Tries each model on 404, and retries without the schema on a 400.
 */
// Gemini sometimes cuts a streamed answer short (the SDK then throws "Incomplete JSON segment at
// the end"), or is briefly overloaded. Those are worth another try: once more on the same model,
// then on the next one, while there's time left. A missing model (404) moves on straight away.
export function isPassingGeminiError(err: unknown) {
  const e = err as { status?: number; message?: string };
  if (e?.status && (e.status >= 500 || e.status === 408)) return true;
  return /incomplete json|unexpected end|terminated|socket|ECONNRESET|fetch failed|network|premature/i.test(e?.message ?? "");
}

type GeminiStream = AsyncIterable<{ text?: string; candidates?: { finishReason?: string }[] }>;

export async function readGemini(opts: {
  tag: string;
  deadline: number;
  start: (model: string) => Promise<GeminiStream>;
  onChars: (n: number) => void;
  onProgress: () => void;
  models?: string[];
}): Promise<{ text: string; finishReason?: string }> {
  const { tag, deadline, start, onChars, onProgress, models = GEMINI_MODELS } = opts;
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (lastErr && Date.now() > deadline - 20_000) throw lastErr;
      try {
        const gen = await start(model);
        let text = "";
        let finishReason: string | undefined;
        let sentAt = 0;
        for await (const chunk of gen) {
          text += chunk.text ?? "";
          onChars(text.length);
          finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
          if (Date.now() - sentAt > 600) {
            onProgress();
            sentAt = Date.now();
          }
        }
        return { text, finishReason };
      } catch (err) {
        lastErr = err;
        onChars(0);
        if ((err as { status?: number })?.status === 404) {
          console.warn(`[${tag}] ${model} not available, trying the next model.`);
          break;
        }
        if (!isPassingGeminiError(err)) throw err;
        console.warn(`[${tag}] ${model} attempt ${attempt + 1} failed, trying again:`, (err as Error)?.message);
      }
    }
  }
  throw lastErr;
}

export function streamGeminiJson(opts: {
  tag: string;
  ai: GoogleGenAI;
  contents: string;
  systemInstruction: string;
  schema: Schema;
  what: string;
  finish: (parsed: unknown) => Result;
}): Response {
  const { tag, ai, contents, systemInstruction, schema, what, finish } = opts;
  const deadline = Date.now() + 280_000;
  const call = (model: string, withSchema: boolean) =>
    ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: schema } : {}),
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
      console.warn(`[${tag}] ${model}: retrying without responseSchema:`, (err as Error)?.message);
      return await call(model, false);
    }
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let chars = 0;
      const send = (o: object) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const result = (r: Result) => send({ type: "result", ...r });
      send({ type: "progress", chars });
      const beat = setInterval(() => send({ type: "progress", chars }), 4_000);
      try {
        const { text, finishReason } = await readGemini({
          tag, deadline, start: tryModel,
          onChars: (n: number) => { chars = n; },
          onProgress: () => send({ type: "progress", chars }),
        });
        if (!text) {
          console.error(`[${tag}] Empty response. finishReason:`, finishReason);
          return result({ ok: false, error: finishReason === "SAFETY" ? "The AI declined this request. Try rewording it." : "The AI returned an empty response. Please try again." });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
        } catch {
          console.error(`[${tag}] Non-JSON response:`, finishReason, text.slice(0, 500));
          return result({ ok: false, error: "The AI returned an unexpected format. Please try again." });
        }
        result(finish(parsed));
      } catch (err: unknown) {
        const e = err as { status?: number; name?: string; message?: string };
        console.error(`[${tag}] Gemini error:`, e?.status, e?.name, e?.message);
        const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError" || Date.now() >= deadline;
        result({ ok: false, error: timedOut ? "The AI took too long this time. Please try again." : explainGeminiError(err, what) });
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" },
  });
}
