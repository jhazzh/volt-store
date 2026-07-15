import "server-only";
import { Xendit } from "xendit-node";
import type { Invoice } from "xendit-node";

/**
 * Xendit Invoice API client — test/live follows the key prefix.
 * @return {Invoice} invoice client
 */
export function createXenditInvoices(): Invoice {
  return new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY! }).Invoice;
}
