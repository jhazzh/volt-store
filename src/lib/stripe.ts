import "server-only";
import Stripe from "stripe";

/**
 * Stripe client — secret key, server only.
 * @return {Stripe} Stripe SDK instance
 */
export function createStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
