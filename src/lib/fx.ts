import "server-only";

/** Last resort when the rate API is down and nothing is cached. */
const FALLBACK_USD_TO_IDR = 16_000;
const TTL_MS = 60 * 60 * 1000; // 1h — FX drift within an hour is negligible here

let cached: { rate: number; at: number } | null = null;

/**
 * Live USD→IDR rate, cached in memory per server instance.
 * @return {Promise<number>} rupiah per US dollar
 */
export async function usdToIdrRate(): Promise<number> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rate;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const rate: unknown = (await res.json())?.rates?.IDR;
    if (typeof rate === "number" && rate > 0) {
      cached = { rate, at: Date.now() };
      return rate;
    }
  } catch {
    // Fall through to stale/fallback.
  }
  return cached?.rate ?? FALLBACK_USD_TO_IDR;
}
