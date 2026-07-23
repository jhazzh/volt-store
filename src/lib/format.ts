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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * @param {string} iso ISO timestamp
 * @return {string} formatted date, e.g. "January 5, 2026"
 */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
