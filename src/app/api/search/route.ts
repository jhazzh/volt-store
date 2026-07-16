import { getProducts } from "@/lib/data";

export type SearchResult = {
  type: "product"; // later: "post" | "page"
  id: string;
  title: string;
  href: string;
  price: number;
  image_url: string | null;
};

/**
 * Live search for the pop-up. One place to add more result types later.
 * @param {Request} request GET /api/search?q=...
 * @return {Promise<Response>} { results: SearchResult[] }
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  const products = await getProducts({ q });
  const results: SearchResult[] = products.slice(0, 8).map((p) => ({
    type: "product",
    id: p.id,
    title: p.name,
    href: `/products/${p.slug}`,
    price: Number(p.price),
    image_url: p.image_url,
  }));

  return Response.json({ results });
}
