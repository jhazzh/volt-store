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
  stock: number;
  image_url: string | null;
  category_id: string | null;
  created_at: string;
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
