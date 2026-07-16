"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  loaded: boolean; // false until localStorage is read (post-mount)
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Cart provider — useOptimistic layer over localStorage-persisted state.
 * @param {{children: ReactNode}} props children
 * @return {JSX.Element} provider
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Hydration-safe localStorage load: SSR renders empty, client fills after mount.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // corrupted storage — start empty
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Guard: the mount render still has the initial empty `items`; writing then
    // would clobber the saved cart before the load effect reads it.
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const dispatch = (action: CartAction) => {
    setItems((prev) => cartReducer(prev, action));
  };

  return (
    <CartContext.Provider
      value={{ items, dispatch, isOpen, setOpen, loaded }}
    >
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
