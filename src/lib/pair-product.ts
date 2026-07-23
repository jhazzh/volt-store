import "server-only";
import { getPairingCandidates } from "@/lib/data";
import { pickComplements } from "@/lib/goes-well-with";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Compute and store one product's complements. Fire-and-forget: called from
 * `after()` on product create/update, so it never blocks the admin response
 * and swallows its own errors (an unpaired row just shows no upsells).
 * Uses the admin client because it runs detached, with no session for RLS.
 * @param {string} id product id
 * @param {string} name product name
 * @param {string | null} categoryId product's category
 * @return {Promise<void>} resolves once stored (or skipped)
 */
export async function pairProduct(
  id: string,
  name: string,
  categoryId: string | null
): Promise<void> {
  try {
    const candidates = await getPairingCandidates(id, categoryId);
    if (candidates.length === 0) return; // nothing to pair against yet
    const picks = await pickComplements(name, candidates);
    await createAdminClient()
      .from("products")
      .update({ goes_well_with: picks, paired_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    // Best-effort — the cart simply omits this product's suggestions.
  }
}
