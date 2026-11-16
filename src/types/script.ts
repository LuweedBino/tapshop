// Shared types for the UGC Script Generator and "Build My Video With AI" (API route, drawer and Video Editor).

// Story types (the request's `framework`). `structure` is sent to Gemini; label/blurb/group are for the UI.
// The Video Editor's guided maker (vendor/tapshop-studio/video-agent.js) keeps its own copy of ids and labels.
export const STORY_TYPES = [
  { id: "AUTO", group: "Pick for me", label: "✨ Pick for me", blurb: "The AI picks the best story for your product.",
    structure: "Choose whichever story shape below fits this product and audience best, and say which in the title." },
  { id: "PAS", group: "Sell it", label: "Problem → Agitate → Solve", blurb: "Name the pain, twist the knife, reveal the fix.",
    structure: "Hook → Problem (name the pain) → Agitate (why it's worse than they think) → Demo/Solution → optional Social Proof → CTA." },
  { id: "3_REASONS", group: "Sell it", label: "3 Reasons Why", blurb: "Three fast, punchy reasons to buy.",
    structure: "Hook (\"3 reasons I'm obsessed with…\") → three Demo/Solution scenes, one reason each → CTA." },
  { id: "TIKTOK_SHOP_HOOK", group: "Sell it", label: "TikTok Shop Hook", blurb: "Deal-driven, urgent, orange-cart energy.",
    structure: "Pattern-interrupt Hook → quick Demo/Solution → value/urgency framing → CTA pointing to the orange cart / TikTok Shop." },
  { id: "BEFORE_AFTER", group: "Sell it", label: "Before / After", blurb: "Life without it, then with it.",
    structure: "Hook teasing the result → Problem (the before) → Demo/Solution (the change) → Social Proof (the after) → CTA." },
  { id: "THIS_VS_THAT", group: "Sell it", label: "This vs That", blurb: "Beat the usual way of doing it.",
    structure: "Hook (\"I tried both\") → Problem (the usual way's flaw) → Demo/Solution (this product winning, side by side) → CTA. Never name a real competitor brand." },
  { id: "PRICE_REVEAL", group: "Sell it", label: "Price Reveal", blurb: "Build value, then reveal the price.",
    structure: "Hook (\"guess how much\") → Demo/Solution showing what it does → Social Proof → reveal in the CTA. Only state a price if one was given; otherwise don't invent a number." },
  { id: "HONEST_REVIEW", group: "Build trust", label: "Honest Review", blurb: "What's good, one real con, a verdict.",
    structure: "Hook → Demo/Solution (what's good) → Problem (one honest, minor downside) → Social Proof (verdict) → CTA." },
  { id: "SKEPTIC_UNBOXING", group: "Build trust", label: "Skeptic Unboxing", blurb: "“I didn't think this would work…” then proof.",
    structure: "Hook (admit doubt) → unboxing/first impression as Problem or Demo → Demo/Solution (the moment it wins them over) → Social Proof (honest verdict) → CTA." },
  { id: "STORYTIME", group: "Build trust", label: "Storytime", blurb: "A personal story that leads to the product.",
    structure: "Hook (\"so this happened…\") → Problem (the struggle) → Agitate → Demo/Solution (how the product came in) → CTA." },
  { id: "MYTH_VS_TRUTH", group: "Build trust", label: "Myth vs Truth", blurb: "Bust a common myth.",
    structure: "Hook stating the myth → Problem (why people believe it) → Demo/Solution (the truth, shown with the product) → CTA." },
  { id: "DEINFLUENCING", group: "Build trust", label: "De-influencing", blurb: "Skip the hype, get this instead.",
    structure: "Hook (\"don't buy the viral one, get this\") → Problem (what's wrong with the hyped kind) → Demo/Solution → CTA. Never name or attack a real brand." },
  { id: "DONT_BUY_UNTIL", group: "Build trust", label: "Don't Buy Until…", blurb: "Warn, then show what to look for.",
    structure: "Hook (\"don't buy a ___ until you see this\") → Problem → Demo/Solution (what to look for, and how this product has it) → CTA." },
  { id: "UNBOXING", group: "Show it", label: "Unboxing", blurb: "Open it on camera, first look.",
    structure: "Hook → Demo/Solution scenes for packaging, first touch and first use → Social Proof (first impression) → CTA." },
  { id: "HOW_TO_USE", group: "Show it", label: "How to Use It", blurb: "Step by step.",
    structure: "Hook (show the result first) → 2–3 Demo/Solution steps → CTA." },
  { id: "HACK", group: "Show it", label: "Hack / Tutorial", blurb: "A clever trick with the product.",
    structure: "Hook (\"this hack…\") → Problem → Demo/Solution (the hack) → CTA." },
  { id: "DAY_IN_LIFE", group: "Show it", label: "Day in My Life", blurb: "The product inside a real day.",
    structure: "Hook → several quick Demo/Solution moments through the day → CTA." },
  { id: "GRWM", group: "Show it", label: "GRWM / Routine", blurb: "Get ready with me, product as the star.",
    structure: "Hook → Demo/Solution steps of the routine → Social Proof (the finished result) → CTA." },
  { id: "ASMR_DEMO", group: "Show it", label: "ASMR Demo", blurb: "Sounds and textures, few words.",
    structure: "Hook (a satisfying sound or visual) → Demo/Solution close-ups with very short lines → CTA. On-screen text carries the message." },
  { id: "POV", group: "Hook-first", label: "POV", blurb: "A relatable moment.",
    structure: "Hook as a POV line → Problem → Demo/Solution → CTA. The hook's on-screen text starts with 'POV:'." },
  { id: "MISTAKES", group: "Hook-first", label: "Mistakes You're Making", blurb: "Call out a mistake, fix it.",
    structure: "Hook (\"you're doing ___ wrong\") → Problem (the mistake) → Demo/Solution (the fix with the product) → CTA." },
  { id: "WISH_I_KNEW", group: "Hook-first", label: "Things I Wish I Knew", blurb: "What I'd tell my past self.",
    structure: "Hook → Problem (life before) → Demo/Solution (what I learned) → CTA." },
  { id: "TOP_3", group: "Hook-first", label: "Top 3 List", blurb: "Countdown with the product at #1.",
    structure: "Hook (\"top 3 ___\") → Demo/Solution for #3 and #2 (general tips, never real brands) → #1 is the product → CTA." },
  { id: "WAIT_FOR_IT", group: "Hook-first", label: "Wait for It… Reveal", blurb: "Build up to a satisfying reveal.",
    structure: "Hook (\"wait for it…\") → build-up scenes → Demo/Solution reveal → CTA." },
  { id: "PUT_TO_TEST", group: "Hook-first", label: "Put It to the Test", blurb: "Stress-test it on camera.",
    structure: "Hook (\"I tried to break it\") → Demo/Solution tests → Social Proof (the result) → CTA. Only test what the given benefits claim." },
] as const;

export const FRAMEWORKS = STORY_TYPES.map((s) => s.id) as readonly ScriptFramework[];
// The four shown as big cards in the Script Writer drawer; the rest are in its "More story types" menu.
export const POPULAR_FRAMEWORKS = ["PAS", "3_REASONS", "SKEPTIC_UNBOXING", "TIKTOK_SHOP_HOOK"] as const;
export const DURATIONS = [15, 30, 60] as const;
export const TONES = ["Casual & Authentic", "High Energy", "ASMR / Calm", "Storytime"] as const;
export const SECTION_TYPES = ["Hook", "Problem", "Agitate", "Demo/Solution", "Social Proof", "CTA"] as const;
export const PLATFORMS = ["tiktok", "shorts", "reels", "stories", "youtube", "square", "feed"] as const;

export type ScriptFramework = (typeof STORY_TYPES)[number]["id"];
export type ScriptPlatform = (typeof PLATFORMS)[number];
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
  /** Where it will be posted, so the CTA fits ("orange cart" on TikTok, "link in bio" on Reels…). */
  platform?: ScriptPlatform;
  /** No talking: the words live in on-screen text, voiceover lines stay very short. */
  textOnly?: boolean;
}

export type GenerateScriptResponse =
  | { ok: true; script: GeneratedUGCScript }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const FRAMEWORK_LABELS = Object.fromEntries(
  STORY_TYPES.map((s) => [s.id, { label: s.label, blurb: s.blurb, group: s.group, structure: s.structure }]),
) as Record<ScriptFramework, { label: string; blurb: string; group: string; structure: string }>;
