import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddToCart } from "@/components/add-to-cart";
import { makeProduct } from "@/lib/test/fixtures";

const dispatch = vi.fn();
const setOpen = vi.fn();

// Mock the cart context so the button can be tested in isolation.
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ dispatch, setOpen, items: [], isOpen: false }),
}));

const product = makeProduct({ description: "", image_url: null });

describe("AddToCart", () => {
  beforeEach(() => {
    dispatch.mockClear();
    setOpen.mockClear();
  });

  it("adds the product and opens the drawer on click", async () => {
    render(<AddToCart product={product} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "add" }),
    );
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it("disables the button when out of stock", () => {
    render(<AddToCart product={{ ...product, stock: 0 }} />);
    const btn = screen.getByRole("button", { name: "Out of stock" });
    expect(btn).toBeDisabled();
  });
});
