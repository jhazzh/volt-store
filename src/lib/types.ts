export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number | null;
  product_type: "simple" | "digital";
  delivery_type: "file" | "key" | "access" | "url" | null;
  delivery_value: string | null;
  image_url: string | null;
  category_id: string | null;
  review_summary: string | null;
  review_summary_count: number;
  specs?: ProductSpec[];
  created_at: string;
};

export type ProductSpec = {
  key: string;
  value: string;
};

export type SpecKeyType = "text" | "number" | "boolean" | "enum" | "multiselect";

export type SpecKey = {
  name: string;
  type: SpecKeyType;
  // enum + multiselect both draw options from spec_key_values.
  allowed_values: string[];
};

// One selectable filter option in the facet sidebar, with its product count.
export type SpecFacet = {
  key: string;
  value: string;
  count: number;
};

export type ReviewTag = {
  topic: string; // short aspect, e.g. "battery", "price"
  sentiment: "positive" | "neutral" | "negative";
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  body: string;
  tags: ReviewTag[];
  created_at: string;
};

export type ReviewStats = {
  count: number;
  average: number | null;
};

export type CartItem = {
  product: Pick<Product, "id" | "name" | "slug" | "price" | "image_url">;
  qty: number;
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: "pending" | "paid" | "cancelled" | "refunded" | "partially_refunded";
  stripe_session_id: string | null;
  paypal_order_id: string | null;
  xendit_invoice_id: string | null;
  created_at: string;
};
