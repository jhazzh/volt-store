const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * @param {number} value amount
 * @return {string} formatted currency
 */
export function formatPrice(value: number): string {
  return formatter.format(value);
}
