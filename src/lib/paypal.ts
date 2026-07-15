import "server-only";
import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

/**
 * PayPal Orders API client — sandbox unless PAYPAL_ENV=production.
 * @return {OrdersController} orders controller
 */
export function createPaypalOrders(): OrdersController {
  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    },
    environment:
      process.env.PAYPAL_ENV === "production" ? Environment.Production : Environment.Sandbox,
  });
  return new OrdersController(client);
}
