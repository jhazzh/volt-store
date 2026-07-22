import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CompareVerdict } from "@/components/compare-verdict";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/compare";
import { getProductsByIds } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare products",
  description: "See products side by side with an AI verdict on which to pick.",
};

type Props = {
  searchParams: Promise<{ ids?: string | string[] }>;
};

/** Parse ?ids=a,b,c (or repeated ?ids=) into a clean, capped id list. */
function parseIds(raw: string | string[] | undefined): string[] {
  const parts = Array.isArray(raw) ? raw : (raw ?? "").split(",");
  return [...new Set(parts.map((s) => s.trim()).filter(Boolean))].slice(
    0,
    COMPARE_MAX
  );
}

/** Every spec key present on any product, in first-seen order. */
function specKeys(products: Product[]): string[] {
  const keys: string[] = [];
  for (const p of products) {
    for (const s of p.specs ?? []) {
      if (!keys.includes(s.key)) keys.push(s.key);
    }
  }
  return keys;
}

export default async function ComparePage({ searchParams }: Props) {
  const ids = parseIds((await searchParams).ids);
  const products = ids.length ? await getProductsByIds(ids) : [];

  if (products.length < COMPARE_MIN) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Compare products</h1>
        <p className="text-black/60 dark:text-white/60">
          Pick at least {COMPARE_MIN} products from the shop to compare them
          side by side.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Browse products
        </Link>
      </main>
    );
  }

  const keys = specKeys(products);

  return (
    <main className="py-10">
      <h1 className="mx-auto mb-6 max-w-6xl px-4 text-2xl font-semibold">
        Comparing {products.length} products
      </h1>

      <div className="mx-auto max-w-6xl overflow-x-auto px-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 p-3" />
              {products.map((p) => (
                <th key={p.id} className="min-w-40 p-3 align-top">
                  <Link href={`/products/${p.slug}`} className="block">
                    {p.image_url && (
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        width={120}
                        height={120}
                        className="mx-auto mb-2 h-24 w-24 rounded-md object-cover"
                      />
                    )}
                    <span className="font-medium hover:underline">
                      {p.name}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-black/10 dark:border-white/10">
              <th className="p-3 text-left font-medium text-black/60 dark:text-white/60">
                Price
              </th>
              {products.map((p) => (
                <td key={p.id} className="p-3 text-center">
                  {formatPrice(p.price)}
                </td>
              ))}
            </tr>
            {keys.map((key) => (
              <tr
                key={key}
                className="border-t border-black/10 dark:border-white/10"
              >
                <th className="p-3 text-left font-medium text-black/60 dark:text-white/60">
                  {key}
                </th>
                {products.map((p) => {
                  const spec = (p.specs ?? []).find((s) => s.key === key);
                  return (
                    <td
                      key={p.id}
                      className="p-3 text-center text-black/40 dark:text-white/40"
                    >
                      {spec?.value ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CompareVerdict ids={products.map((p) => p.id)} />
    </main>
  );
}
