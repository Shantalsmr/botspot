import "server-only";
import Stripe from "stripe";

let client: Stripe | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Cliente unico de Stripe (reutilizado entre invocaciones serverless). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe no esta configurado. Define STRIPE_SECRET_KEY.");
  client ??= new Stripe(key);
  return client;
}
