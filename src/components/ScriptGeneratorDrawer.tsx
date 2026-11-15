"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  DURATIONS,
  FRAMEWORKS,
  FRAMEWORK_LABELS,
  TONES,
  type GenerateScriptRequest,
  type GenerateScriptResponse,
  type GeneratedUGCScript,
  type ScriptScene,
  type SectionType,
} from "@/types/script";

interface ScriptGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks "Use in Editor". Receives the script with the chosen hook applied to scene 1. */
  onUseScript?: (script: GeneratedUGCScript) => void;
  /**
   * Sends the script to TapShop's voiceover recorder / teleprompter.
   * fullVoiceoverText = every voiceoverLine joined with blank lines; scenes = full scene list (for timeline markers).
   * The chosen hook is already applied to scene 1.
   */
  onSendToVoiceover?: (fullVoiceoverText: string, scenes: ScriptScene[]) => void;
  /** Optional prefill (e.g. from the current storefront product). */
  initialValues?: Partial<GenerateScriptRequest>;
}

const SECTION_STYLES: Record<SectionType, string> = {
  Hook: "bg-[#C59B57]/15 text-[#E2C38E] border-[#C59B57]/40",
  Problem: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  "Demo/Solution": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  "Social Proof": "bg-sky-500/10 text-sky-300 border-sky-500/30",
  CTA: "bg-violet-500/10 text-violet-300 border-violet-500/30",
};

const DEFAULT_FORM: GenerateScriptRequest = {
  productName: "",
  keyBenefits: "",
  targetAudience: "",
  framework: "PAS",
  durationSeconds: 30,
  tone: "Casual & Authentic",
};

function scriptToPlainText(script: GeneratedUGCScript): string {
  const lines = [`${script.title} (${script.estimatedTotalSeconds}s)`, ""];
  lines.push("HOOK VARIATIONS");
  script.hookVariations.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
  lines.push("");
  script.scenes.forEach((s) => {
    lines.push(`SCENE ${s.sceneNumber} — ${s.sectionType} (${s.durationSeconds}s)`);
    lines.push(`Visual: ${s.visualDirection}`);
    lines.push(`VO: ${s.voiceoverLine}`);
    if (s.onScreenText) lines.push(`Text: ${s.onScreenText}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

export default function ScriptGeneratorDrawer({
  open,
  onClose,
  onUseScript,
  onSendToVoiceover,
  initialValues,
}: ScriptGeneratorDrawerProps) {
  const [form, setForm] = useState<GenerateScriptRequest>({ ...DEFAULT_FORM, ...initialValues });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [script, setScript] = useState<GeneratedUGCScript | null>(null);
  const [selectedHook, setSelectedHook] = useState(0); // 0 = original scene-1 line, 1..3 = variations
  const [copied, setCopied] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titleId = useId();

  // Re-apply prefill whenever the drawer opens with new values.
  useEffect(() => {
    if (open && initialValues) setForm((f) => ({ ...f, ...initialValues }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Kept in a ref so a parent passing a new arrow function each render doesn't re-run the effect below.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape to close, lock body scroll, focus first field.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open]);

  // Cancel any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = <K extends keyof GenerateScriptRequest>(key: K, value: GenerateScriptRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key])
      setFieldErrors((old) => {
        const next = { ...old };
        delete next[key];
        return next;
      });
  };

  const generate = useCallback(async () => {
    const localErrors: Record<string, string> = {};
    if (!form.productName.trim()) localErrors.productName = "Product name is required.";
    if (!form.keyBenefits.trim()) localErrors.keyBenefits = "Add at least one key benefit.";
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetAudience: form.targetAudience?.trim() || undefined }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as GenerateScriptResponse | null;
      if (!data) throw new Error("Unexpected server response.");
      if (!data.ok) {
        setError(data.error);
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return;
      }
      setScript(data.script);
      setSelectedHook(0);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Network error. Check your connection and try again.");
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [form]);

  const scriptWithHook = useCallback((): GeneratedUGCScript | null => {
    if (!script) return null;
    if (selectedHook === 0) return script;
    const hook = script.hookVariations[selectedHook - 1];
    return {
      ...script,
      scenes: script.scenes.map((s, i) => (i === 0 ? { ...s, voiceoverLine: hook } : s)),
    };
  }, [script, selectedHook]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  };

  const active = scriptWithHook();

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col border-l border-white/10 bg-[#0F1115] text-zinc-100 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C59B57]/40 bg-[#C59B57]/10 text-[#C59B57]">
              <SparkIcon />
            </span>
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                UGC Script Generator
              </h2>
              <p className="text-xs text-zinc-500">Scroll-stopping scripts in seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57]"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
            className="space-y-5 px-6 py-6"
          >
            <Field label="Product name" required error={fieldErrors.productName}>
              <input
                ref={firstFieldRef}
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                maxLength={120}
                placeholder="e.g. GlowDrop Vitamin C Serum"
                className={inputCls(!!fieldErrors.productName)}
              />
            </Field>

            <Field label="Key benefits" required error={fieldErrors.keyBenefits} hint="Only claims the brand approved.">
              <textarea
                value={form.keyBenefits}
                onChange={(e) => update("keyBenefits", e.target.value)}
                maxLength={1500}
                rows={3}
                placeholder="Fades dark spots in 2 weeks, lightweight, no sticky feel, fragrance-free"
                className={`${inputCls(!!fieldErrors.keyBenefits)} resize-none`}
              />
            </Field>

            <Field label="Target audience" error={fieldErrors.targetAudience} hint="Optional">
              <input
                value={form.targetAudience}
                onChange={(e) => update("targetAudience", e.target.value)}
                maxLength={400}
                placeholder="Women 25–40 with sensitive skin"
                className={inputCls(!!fieldErrors.targetAudience)}
              />
            </Field>

            <div>
              <Label>Framework</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {FRAMEWORKS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update("framework", f)}
                    aria-pressed={form.framework === f}
                    className={`rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57] ${
                      form.framework === f
                        ? "border-[#C59B57] bg-[#C59B57]/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className={`text-sm font-medium ${form.framework === f ? "text-[#E2C38E]" : "text-zinc-200"}`}>
                      {FRAMEWORK_LABELS[f].label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">{FRAMEWORK_LABELS[f].blurb}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
              <div>
                <Label>Length</Label>
                <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update("durationSeconds", d)}
                      aria-pressed={form.durationSeconds === d}
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57] ${
                        form.durationSeconds === d ? "bg-[#C59B57] text-[#0F1115]" : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tone</Label>
                <select
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value as GenerateScriptRequest["tone"])}
                  className={`${inputCls(false)} mt-2`}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t} className="bg-[#0F1115]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C59B57] px-4 py-3 text-sm font-semibold text-[#0F1115] transition hover:bg-[#D4AE6E] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1115]"
            >
              {loading ? (
                <>
                  <Spinner /> Writing your script…
                </>
              ) : script ? (
                <>
                  <SparkIcon /> Regenerate
                </>
              ) : (
                <>
                  <SparkIcon /> Generate Script
                </>
              )}
            </button>
          </form>

          {/* Loading skeleton */}
          {loading && !script && (
            <div className="space-y-3 border-t border-white/10 px-6 py-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
              ))}
            </div>
          )}

          {/* Results */}
          {script && active && (
            <section
              className={`border-t border-white/10 px-6 py-6 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
              aria-live="polite"
            >
              <div className="mb-5">
                <h3 className="text-lg font-semibold tracking-tight">{script.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {script.scenes.length} scenes · ~{script.estimatedTotalSeconds}s
                </p>
              </div>

              {/* Hook A/B picker */}
              <div className="mb-6">
                <Label>Pick your hook</Label>
                <div className="mt-2 space-y-2">
                  {[script.scenes[0]?.voiceoverLine ?? "", ...script.hookVariations].map((hook, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedHook(i)}
                      aria-pressed={selectedHook === i}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        selectedHook === i
                          ? "border-[#C59B57] bg-[#C59B57]/10 text-zinc-100"
                          : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          selectedHook === i ? "bg-[#C59B57] text-[#0F1115]" : "bg-white/10 text-zinc-400"
                        }`}
                      >
                        {i === 0 ? "Orig" : String.fromCharCode(64 + i)}
                      </span>
                      <span>“{hook}”</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline bar */}
              <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-white/5">
                {active.scenes.map((s) => (
                  <div
                    key={s.sceneNumber}
                    title={`${s.sectionType} · ${s.durationSeconds}s`}
                    style={{ width: `${(s.durationSeconds / active.estimatedTotalSeconds) * 100}%` }}
                    className={`border-r border-[#0F1115] last:border-r-0 ${SECTION_STYLES[s.sectionType].split(" ")[0]}`}
                  />
                ))}
              </div>

              {/* Scenes */}
              <ol className="space-y-3">
                {active.scenes.map((s) => (
                  <SceneCard key={s.sceneNumber} scene={s} copied={copied} onCopy={copy} />
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Footer */}
        {script && active && (
          <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#0B0D10] px-6 py-4">
            {/* Copy Full Script */}
            <button
              onClick={() => copy(scriptToPlainText(active), "all")}
              disabled={loading}
              aria-live="polite"
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57] ${
                copied === "all"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-zinc-200 hover:border-[#C59B57]/50 hover:text-[#E2C38E]"
              }`}
            >
              {copied === "all" ? <CheckIcon /> : <CopyIcon />}
              {copied === "all" ? "Copied!" : "Copy Full Script"}
            </button>

            {/* Send to Voiceover / Teleprompter */}
            <span className="group relative">
              <button
                onClick={() => {
                  if (!onSendToVoiceover) return;
                  const fullVoiceoverText = active.scenes
                    .map((s) => s.voiceoverLine.trim())
                    .filter(Boolean)
                    .join("\n\n");
                  onSendToVoiceover(fullVoiceoverText, active.scenes);
                }}
                disabled={!onSendToVoiceover || loading}
                aria-describedby={!onSendToVoiceover ? "vo-tooltip" : undefined}
                className="flex items-center gap-2 rounded-lg border border-[#C59B57]/40 bg-[#C59B57]/10 px-3.5 py-2 text-sm font-medium text-[#E2C38E] transition hover:bg-[#C59B57]/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57]"
              >
                <MicIcon />
                Send to Voiceover
              </button>
              {!onSendToVoiceover && (
                <span
                  id="vo-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#1A1D23] px-2.5 py-1.5 text-xs text-zinc-300 opacity-0 shadow-lg transition group-hover:opacity-100"
                >
                  Voiceover recorder coming soon
                </span>
              )}
            </span>

            {/* Use in Editor (optional) */}
            {onUseScript && (
              <button
                onClick={() => onUseScript(active)}
                disabled={loading}
                className="ml-auto rounded-lg bg-[#C59B57] px-4 py-2 text-sm font-semibold text-[#0F1115] transition hover:bg-[#D4AE6E] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B57]"
              >
                Use in Editor
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SceneCard({
  scene,
  copied,
  onCopy,
}: {
  scene: ScriptScene;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const key = `scene-${scene.sceneNumber}`;
  return (
    <li className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">#{scene.sceneNumber}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${SECTION_STYLES[scene.sectionType]}`}>
            {scene.sectionType}
          </span>
          <span className="text-xs text-zinc-500">{scene.durationSeconds}s</span>
        </div>
        <button
          onClick={() => onCopy(scene.voiceoverLine, key)}
          className="text-xs text-zinc-500 opacity-0 transition hover:text-[#E2C38E] focus:opacity-100 group-hover:opacity-100"
        >
          {copied === key ? "Copied!" : "Copy line"}
        </button>
      </div>

      <p className="text-[15px] leading-relaxed text-zinc-100">“{scene.voiceoverLine}”</p>

      <div className="mt-3 space-y-1.5 text-xs">
        <p className="text-zinc-400">
          <span className="font-semibold uppercase tracking-wider text-zinc-500">Film: </span>
          {scene.visualDirection}
        </p>
        {scene.onScreenText && (
          <p className="text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Text: </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[#E2C38E]">{scene.onScreenText}</span>
          </p>
        )}
      </div>
    </li>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{children}</span>;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <Label>
          {label}
          {required && <span className="ml-0.5 text-[#C59B57]">*</span>}
        </Label>
        {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:outline-none focus:ring-2 ${
    hasError
      ? "border-rose-500/50 focus:ring-rose-500/40"
      : "border-white/10 focus:border-[#C59B57]/60 focus:ring-[#C59B57]/30"
  }`;
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
