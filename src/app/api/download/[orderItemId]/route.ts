import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "digital-goods";
const SIGNED_URL_TTL = 60; // seconds
const TOKEN_GUESSES_PER_HOUR = 30;

const ITEM_SELECT =
  "id, orders!inner(status, access_token, user_id), products!inner(product_type, delivery_type, delivery_value)";

type ItemRow = {
  id: string;
  orders: { status: string; access_token: string; user_id: string | null };
  products: {
    product_type: string;
    delivery_type: "file" | "key" | "access" | "url" | null;
    delivery_value: string | null;
  };
};

/**
 * Deliver a purchased digital product.
 *
 * Ownership is proven one of two ways, mirroring the order page:
 * - Logged-in buyer: the cookie (RLS) client only returns their own rows.
 * - Guest: ?token= must match the order's access_token AND the order must be
 *   guest-owned (user_id null). Wrong guesses are rate-limited per IP.
 *
 * @param {Request} request GET /api/download/:orderItemId?token=
 * @param {{ params: Promise<{ orderItemId: string }> }} ctx Route params
 * @return {Promise<Response>} Redirect (file/url) or JSON (key/access)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  const { orderItemId } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const supabase = await createClient();

  // 1. Logged-in owner via RLS.
  let { data } = await supabase
    .from("order_items")
    .select(ITEM_SELECT)
    .eq("id", orderItemId)
    .maybeSingle<ItemRow>();

  // 2. Guest: validate the order access_token admin-side, rate-limited.
  if (!data && token) {
    const admin = createAdminClient();
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `download-token:${ip}`;

    const { data: guesses } = await admin
      .from("rate_limits")
      .select("count, window_start")
      .eq("key", key)
      .maybeSingle();
    const lockedOut =
      !!guesses &&
      guesses.count >= TOKEN_GUESSES_PER_HOUR &&
      Date.now() - new Date(guesses.window_start).getTime() < 3_600_000;

    if (!lockedOut) {
      ({ data } = await admin
        .from("order_items")
        .select(ITEM_SELECT)
        .eq("id", orderItemId)
        .eq("orders.access_token", token)
        .is("orders.user_id", null)
        .maybeSingle<ItemRow>());
      // Only wrong tokens count, so a real buyer refreshing never locks out.
      if (!data) {
        await admin.rpc("bump_rate_limit", {
          p_key: key,
          p_window: "1 hour",
          p_max: TOKEN_GUESSES_PER_HOUR,
        });
      }
    }
  }

  if (!data) return new Response("Not found", { status: 404 });
  if (data.orders.status !== "paid")
    return new Response("Order not paid", { status: 403 });

  const product = data.products;
  if (product.product_type !== "digital" || !product.delivery_value)
    return new Response("Nothing to download", { status: 404 });

  switch (product.delivery_type) {
    case "file": {
      // Mint a short-lived signed URL for the private file, then redirect.
      const { data: signed, error: signErr } = await createAdminClient()
        .storage.from(BUCKET)
        .createSignedUrl(product.delivery_value, SIGNED_URL_TTL);
      if (signErr || !signed)
        return new Response("File unavailable", { status: 502 });
      return Response.redirect(signed.signedUrl);
    }
    case "url":
      return Response.redirect(product.delivery_value);
    case "key":
    case "access":
      return Response.json({ type: product.delivery_type, value: product.delivery_value });
    default:
      return new Response("Unknown delivery type", { status: 500 });
  }
}
