import { Nunito, Playfair_Display, Space_Grotesk } from "next/font/google";
import type { Font } from "./design";

const elegant = Playfair_Display({ subsets: ["latin"], display: "swap" });
const friendly = Nunito({ subsets: ["latin"], display: "swap" });
const techy = Space_Grotesk({ subsets: ["latin"], display: "swap" });

// "modern" keeps the app's system font stack.
export const FONT_CLASS: Record<Font, string> = {
  modern: "",
  elegant: elegant.className,
  friendly: friendly.className,
  techy: techy.className,
};
