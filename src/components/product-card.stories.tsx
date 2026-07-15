import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/types";

const base: Product = {
  id: "p1",
  name: "Nimbus Headphones",
  slug: "nimbus-headphones",
  description: "Wireless over-ear headphones.",
  price: 199,
  stock: 5,
  image_url: "https://picsum.photos/seed/nimbus/800/800",
  category_id: "c1",
  created_at: "2026-01-01T00:00:00Z",
};

const meta = {
  title: "Store/ProductCard",
  component: ProductCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  // Card's <Link> renders an inline <a>; grid gives it block width in the app.
  // Reproduce that here with a fixed-width grid so the image is contained.
  decorators: [
    (Story) => (
      <div style={{ display: "grid", width: 260 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { product: base },
};

export const OutOfStock: Story = {
  args: { product: { ...base, stock: 0 } },
};

export const LongName: Story = {
  args: {
    product: {
      ...base,
      name: "Nimbus Pro Max Wireless Noise-Cancelling Headphones",
    },
  },
};
