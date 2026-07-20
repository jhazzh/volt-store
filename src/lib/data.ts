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
  const allowed = filters.category
    ? new Set(
        (await getProducts({ category: filters.category })).map((p) => p.id)
      )
    : null;

  const seen = new Set(keyword.map((p) => p.id));
  const extra = semantic.filter(
    (p) => !seen.has(p.id) && (!allowed || allowed.has(p.id))
  );

  // An explicit sort must win over relevance ordering.
  if (filters.sort === "price-asc" || filters.sort === "price-desc") {
    const dir = filters.sort === "price-asc" ? 1 : -1;
    return [...keyword, ...extra].sort(
      (a, b) => (Number(a.price) - Number(b.price)) * dir
    );
  }
  return [...keyword, ...extra];
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
