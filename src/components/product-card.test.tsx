import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/product-card";
import { makeProduct } from "@/lib/test/fixtures";

// image_url is a local path to avoid next/image remote-host check in jsdom.
const product = makeProduct();

describe("ProductCard", () => {
  it("shows name, formatted price, and links to the PDP", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText("Nimbus Headphones")).toBeInTheDocument();
    expect(screen.getByText("$199.00")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/products/nimbus-headphones",
    );
  });

  it("marks out-of-stock products", () => {
    render(<ProductCard product={{ ...product, stock: 0 }} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("eager-loads the image only when eager is set", () => {
    const { rerender } = render(<ProductCard product={product} />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");

    rerender(<ProductCard product={product} eager />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });
});
