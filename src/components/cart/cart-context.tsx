"use client";

import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { cartReducer, type CartAction } from "@/lib/cart";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "cart:v1";

type CartContextValue = {
  items: CartItem[];
  dispatch: (action: CartAction) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Cart provider — useOptimistic layer over localStorage-persisted state.
 * @param {{children: ReactNode}} props children
 * @return {JSX.Element} provider
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [optimisticItems, applyOptimistic] = useOptimistic(items, cartReducer);
  const [, startTransition] = useTransition();
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    // Hydration-safe localStorage load: SSR renders empty, client fills after mount.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted storage — start empty
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const dispatch = (action: CartAction) => {
    startTransition(() => {
      applyOptimistic(action);
      setItems((prev) => cartReducer(prev, action));
    });
  };

  return (
    <CartContext.Provider value={{ items: optimisticItems, dispatch, isOpen, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * @return {CartContextValue} cart context
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
