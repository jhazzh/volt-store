import type { CartItem } from "./types";

export type CartAction =
  | { type: "add"; item: CartItem }
  | { type: "remove"; productId: string }
  | { type: "setQty"; productId: string; qty: number }
  | { type: "clear" };

/**
 * Pure cart reducer — shared by useOptimistic and base state.
 * @param {CartItem[]} items current cart
 * @param {CartAction} action mutation
 * @return {CartItem[]} next cart
 */
export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = items.find((i) => i.product.id === action.item.product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === action.item.product.id
            ? { ...i, qty: Math.min(i.qty + action.item.qty, 99) }
            : i
        );
      }
      return [...items, action.item];
    }
    case "remove":
      return items.filter((i) => i.product.id !== action.productId);
    case "setQty":
      if (action.qty < 1) {
        return items.filter((i) => i.product.id !== action.productId);
      }
      return items.map((i) =>
        i.product.id === action.productId ? { ...i, qty: Math.min(action.qty, 99) } : i
      );
    case "clear":
      return [];
  }
}

/**
 * @param {CartItem[]} items cart
 * @return {number} order total
 */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
}

/**
 * @param {CartItem[]} items cart
 * @return {number} item count
 */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
