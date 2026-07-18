import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCard } from "./product-card";
import { makeProduct } from "@/lib/test/fixtures";

const base = makeProduct({
  image_url: "https://picsum.photos/seed/nimbus/800/800",
});

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
