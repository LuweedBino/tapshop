import Stripe from "stripe";
import { env } from "./env";

let client: Stripe | null = null;

export function stripeEnabled() {
  return Boolean(env.stripeSecretKey);
}

export function stripe() {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(env.stripeSecretKey);
  return client;
}

// Countries where creators can open a Stripe account (stripe.com/global). Stripe fixes an
// account's country at creation, so the creator picks it before onboarding.
export const STRIPE_COUNTRIES: Record<string, string> = {
  AE: "United Arab Emirates", AT: "Austria", AU: "Australia", BE: "Belgium", BG: "Bulgaria",
  BR: "Brazil", CA: "Canada", CH: "Switzerland", CY: "Cyprus", CZ: "Czechia", DE: "Germany",
  DK: "Denmark", EE: "Estonia", ES: "Spain", FI: "Finland", FR: "France", GB: "United Kingdom",
  GI: "Gibraltar", GR: "Greece", HK: "Hong Kong", HR: "Croatia", HU: "Hungary", IE: "Ireland",
  IN: "India", IT: "Italy", JP: "Japan", LI: "Liechtenstein", LT: "Lithuania", LU: "Luxembourg",
  LV: "Latvia", MT: "Malta", MX: "Mexico", MY: "Malaysia", NL: "Netherlands", NO: "Norway",
  NZ: "New Zealand", PL: "Poland", PT: "Portugal", RO: "Romania", SE: "Sweden", SG: "Singapore",
  SI: "Slovenia", SK: "Slovakia", TH: "Thailand", US: "United States",
};
