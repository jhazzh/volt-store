import { z } from "zod";

/** Checkout payload — server re-reads prices; client sends only ids + qty. */
export const checkoutSchema = z.object({
  email: z.email().optional(), // guest checkout receipt; ignored when logged in
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const authSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});
