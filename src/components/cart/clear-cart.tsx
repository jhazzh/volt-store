"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";

/**
 * Clears the cart on mount (order confirmation page).
 * @return {null} renders nothing
 */
export function ClearCart() {
  const { dispatch } = useCart();
  useEffect(() => {
    dispatch({ type: "clear" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
