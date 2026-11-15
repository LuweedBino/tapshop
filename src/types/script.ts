// Shared types for the UGC Script Generator (used by both the API route and the UI).

export const FRAMEWORKS = ["PAS", "3_REASONS", "SKEPTIC_UNBOXING", "TIKTOK_SHOP_HOOK"] as const;
export const DURATIONS = [15, 30, 60] as const;
export const TONES = ["Casual & Authentic", "High Energy", "ASMR / Calm", "Storytime"] as const;
export const SECTION_TYPES = ["Hook", "Problem", "Demo/Solution", "Social Proof", "CTA"] as const;

export type ScriptFramework = (typeof FRAMEWORKS)[number];
export type ScriptDuration = (typeof DURATIONS)[number];
export type ScriptTone = (typeof TONES)[number];
export type SectionType = (typeof SECTION_TYPES)[number];

export interface ScriptScene {
  sceneNumber: number;
  sectionType: SectionType;
  durationSeconds: number;
  visualDirection: string;
  voiceoverLine: string;
  onScreenText: string;
}

export interface GeneratedUGCScript {
  title: string;
  hookVariations: string[]; // 3 alternative opening hook lines for A/B testing
  estimatedTotalSeconds: number;
  scenes: ScriptScene[];
}

export interface GenerateScriptRequest {
  productName: string;
  keyBenefits: string;
  targetAudience?: string;
  framework: ScriptFramework;
  durationSeconds: ScriptDuration;
  tone: ScriptTone;
}

export type GenerateScriptResponse =
  | { ok: true; script: GeneratedUGCScript }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const FRAMEWORK_LABELS: Record<ScriptFramework, { label: string; blurb: string }> = {
  PAS: { label: "Problem → Agitate → Solve", blurb: "Name the pain, twist the knife, reveal the fix." },
  "3_REASONS": { label: "3 Reasons Why", blurb: "Three fast, punchy reasons to buy." },
  SKEPTIC_UNBOXING: { label: "Skeptic Unboxing", blurb: "“I didn't think this would work…” then proof." },
  TIKTOK_SHOP_HOOK: { label: "TikTok Shop Hook", blurb: "Deal-driven, urgent, orange-cart energy." },
};
