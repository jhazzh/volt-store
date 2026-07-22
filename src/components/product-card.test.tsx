import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/product-card";
import { CompareProvider } from "@/components/compare/compare-context";
import { makeProduct } from "@/lib/test/fixtures";

// image_url is a local path to avoid next/image remote-host check in jsdom.
const product = makeProduct();

// ProductCard renders a CompareToggle that needs the compare context.
const renderCard = (ui: ReactElement) =>
  render(<CompareProvider>{ui}</CompareProvider>);

describe("ProductCard", () => {
  it("shows name, formatted price, and links to the PDP", () => {
    renderCard(<ProductCard product={product} />);

    expect(screen.getByText("Nimbus Headphones")).toBeInTheDocument();
    expect(screen.getByText("$199.00")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/products/nimbus-headphones",
    );
  });

  it("marks out-of-stock products", () => {
    renderCard(<ProductCard product={{ ...product, stock: 0 }} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("eager-loads the image only when eager is set", () => {
    const { rerender } = renderCard(<ProductCard product={product} />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");

    rerender(
      <CompareProvider>
        <ProductCard product={product} eager />
      </CompareProvider>,
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  });
});
