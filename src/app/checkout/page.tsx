import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <CheckoutForm guest={!user} />
    </div>
  );
}
