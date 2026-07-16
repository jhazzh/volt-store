/** Toggle payment methods here: false hides the button and blocks the action. */
export const paymentMethods = {
  stripe: true,
  paypal: false,
  xendit: true,
} as const;

export type PaymentMethod = keyof typeof paymentMethods;
