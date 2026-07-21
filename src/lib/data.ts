import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { mergeSearchResults } from "@/lib/merge";
import type {
  Category,
  Product,
  Review,
  ReviewStats,
  SpecFacet,
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
  // Selected spec facets: key → chosen values. Same key = OR, across keys = AND.
  specs?: Record<string, string[]>;
};

/**
 * Product ids matching every selected spec facet (AND across keys, OR within).
 * Returns null when no spec filters are active, so callers skip the constraint.
 * @param {Record<string, string[]>} specs selected key → values
 * @return {Promise<string[] | null>} matching product ids, or null
 */
async function productIdsForSpecs(
  supabase: ReturnType<typeof createStaticClient>,
  specs?: Record<string, string[]>
): Promise<string[] | null> {
  const keys = Object.entries(specs ?? {}).filter(([, v]) => v.length > 0);
  if (keys.length === 0) return null;

  // One set of product ids per key, then intersect (AND across keys).
  let acc: Set<string> | null = null;
  for (const [key, values] of keys) {
    const { data, error } = await supabase
      .from("product_specs")
      .select("product_id")
      .eq("key", key)
      .in("value", values);
    if (error) throw new Error(`productIdsForSpecs: ${error.message}`);
    const rows = (data ?? []) as { product_id: string }[];
    const ids = new Set(rows.map((r) => r.product_id));
    acc =
      acc === null
        ? ids
        : new Set([...acc].filter((id: string) => ids.has(id)));
    if (acc.size === 0) break;
  }
  return [...(acc ?? [])];
}

/**
 * @param {ProductFilters} filters PLP filters
 * @return {Promise<Product[]>} filtered products
 */
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = createStaticClient();

  const specIds = await productIdsForSpecs(supabase, filters.specs);
  if (specIds !== null && specIds.length === 0) return []; // no product matches

  let query = supabase.from("products").select("*, categories!inner(slug)");
  if (specIds !== null) query = query.in("id", specIds);

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

  // Semantic ignores category/spec filters, so re-apply them here to keep the
  // filter honest.
  const hasFacets = filters.category || Object.keys(filters.specs ?? {}).length > 0;
  const allowedIds = hasFacets
    ? new Set(
        (
          await getProducts({ category: filters.category, specs: filters.specs })
        ).map((p) => p.id)
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

/**
 * Spec (key, value) options with product counts, for the filter sidebar.
 * @return {Promise<SpecFacet[]>} facets ordered by key then value
 */
export async function getSpecFacets(): Promise<SpecFacet[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc("spec_facets");
  if (error) throw new Error(`getSpecFacets: ${error.message}`);
  return (data ?? []).map((f: { key: string; value: string; count: number }) => ({
    key: f.key,
    value: f.value,
    count: Number(f.count),
  }));
}
