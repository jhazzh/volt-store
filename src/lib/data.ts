import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Category, Product } from "@/lib/types";

/**
 * Cookieless client for public catalog reads — keeps pages static/ISR.
 * (The cookie-based server client would force dynamic rendering.)
 * @return {ReturnType<typeof createSupabaseClient>} anon Supabase client
 */
function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type ProductFilters = {
  category?: string;
  sort?: "newest" | "price-asc" | "price-desc";
  q?: string;
};

/**
 * @param {ProductFilters} filters PLP filters
 * @return {Promise<Product[]>} filtered products
 */
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = createStaticClient();
  let query = supabase.from("products").select("*, categories!inner(slug)");

  if (filters.category) query = query.eq("categories.slug", filters.category);
  if (filters.q) query = query.ilike("name", `%${filters.q}%`);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(`getProducts: ${error.message}`);
  return data ?? [];
}

/**
 * @param {string} slug product slug
 * @return {Promise<Product | null>} product or null
 */
export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProduct: ${error.message}`);
  return data;
}

/**
 * @return {Promise<Product[]>} 4 newest products
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(4);
  if (error) throw new Error(`getFeaturedProducts: ${error.message}`);
  return data ?? [];
}

/**
 * @return {Promise<Category[]>} all categories
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(`getCategories: ${error.message}`);
  return data ?? [];
}
