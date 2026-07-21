import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { mergeSearchResults } from "@/lib/merge";
import type {
  Category,
  Product,
  Review,
  ReviewStats,
  SpecKey,
  SpecKeyType,
} from "@/lib/types";

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
  if (filters.q) {
    // Strip PostgREST or-syntax chars so user input can't break the filter.
    const q = filters.q.replace(/[,()]/g, " ").trim();
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

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
 * Products ranked by meaning, not keywords. Returns [] when embedding is
 * unavailable so callers degrade to keyword search.
 * @param {string} q search text
 * @param {number} limit max results
 * @return {Promise<Product[]>} semantically nearest products
 */
export async function searchProductsSemantic(
  q: string,
  limit = 8
): Promise<Product[]> {
  const { embedText } = await import("@/lib/embed");
  const embedding = await embedText(q);
  if (!embedding) return [];

  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc("match_products", {
    query_embedding: embedding,
    match_margin: 0.05,
    match_count: limit,
  });
  if (error) return [];
  return data ?? [];
}

/**
 * Catalog search: keyword matches first, then semantic ones the ilike missed.
 * Without `q` this is plain getProducts, so category/sort browsing is unchanged.
 * @param {ProductFilters} filters PLP filters
 * @return {Promise<Product[]>} matching products
 */
export async function searchProducts(
  filters: ProductFilters = {}
): Promise<Product[]> {
  const q = filters.q?.trim();
  if (!q) return getProducts(filters);

  const [keyword, semantic] = await Promise.all([
    getProducts(filters),
    searchProductsSemantic(q, 24),
  ]);

  // Semantic ignores category, so re-apply it here to keep the filter honest.
  const allowedIds = filters.category
    ? new Set(
        (await getProducts({ category: filters.category })).map((p) => p.id)
      )
    : null;

  return mergeSearchResults(keyword, semantic, allowedIds, filters.sort);
}

/**
 * @param {string} slug product slug
 * @return {Promise<Product | null>} product or null
 */
export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_specs(key, value)")
    .eq("slug", slug)
    .order("position", { referencedTable: "product_specs" })
    .maybeSingle();
  if (error) throw new Error(`getProduct: ${error.message}`);
  if (!data) return null;
  // Flatten the joined rows onto product.specs to match the Product type.
  const { product_specs, ...product } = data;
  return { ...product, specs: product_specs ?? [] } as Product;
}

/**
 * @param {string} productId product id
 * @return {Promise<Review[]>} newest reviews first
 */
export async function getReviews(productId: string): Promise<Review[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getReviews: ${error.message}`);
  return data ?? [];
}

/**
 * @param {string} productId product id
 * @return {Promise<ReviewStats>} count + average rating
 */
export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .rpc("review_stats", { p_product_id: productId })
    .maybeSingle<ReviewStats>();
  if (error) throw new Error(`getReviewStats: ${error.message}`);
  return data ?? { count: 0, average: null };
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

/**
 * Controlled vocabulary of spec keys, with type and (for enums) allowed values.
 * @return {Promise<SpecKey[]>} spec keys, alphabetical
 */
export async function getSpecKeys(): Promise<SpecKey[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("spec_keys")
    .select("name, type, spec_key_values(value)")
    .order("name")
    .order("position", { referencedTable: "spec_key_values" });
  if (error) throw new Error(`getSpecKeys: ${error.message}`);
  return (data ?? []).map((k) => ({
    name: k.name,
    type: k.type as SpecKeyType,
    allowed_values: (k.spec_key_values ?? []).map((v: { value: string }) => v.value),
  }));
}
