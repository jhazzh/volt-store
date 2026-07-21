// Encode/decode selected spec facets in URL search params.
// One param per key, prefixed `spec.`, values comma-separated:
//   ?spec.Material=Aluminum,Steel&spec.Color=Red

const PREFIX = "spec.";

/** Read `spec.*` params into a { key: values[] } map. */
export function parseSpecParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string[]> {
  const specs: Record<string, string[]> = {};
  for (const [name, raw] of Object.entries(params)) {
    if (!name.startsWith(PREFIX) || !raw) continue;
    const key = name.slice(PREFIX.length);
    const value = Array.isArray(raw) ? raw.join(",") : raw;
    const values = value.split(",").map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) specs[key] = values;
  }
  return specs;
}

/** The URL param name for a spec key. */
export function specParamName(key: string): string {
  return `${PREFIX}${key}`;
}
