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

/** Admin product form. Digital goods must declare how they're delivered. */
export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and dashes only"),
    description: z.string().trim().max(5000).default(""),
    price: z.coerce.number().min(0),
    image_url: z.url().max(2000).or(z.literal("")).optional(),
    category_id: z.uuid().nullable().optional(),
    product_type: z.enum(["simple", "digital"]),
    // simple only:
    stock: z.coerce.number().int().min(0).optional(),
    // digital only:
    delivery_type: z.enum(["file", "key", "access", "url"]).nullable().optional(),
    delivery_value: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.product_type !== "digital" || !!v.delivery_type, {
    path: ["delivery_type"],
    message: "Digital products need a delivery type",
  });

export type ProductInput = z.infer<typeof productSchema>;
