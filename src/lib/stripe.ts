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
