import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const STRIPE_PLANS = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_test',
  business: process.env.STRIPE_PRICE_BUSINESS || 'price_business_test',
};

export const PLAN_LIMITS = {
  trial: { products: 5, users: 2 },
  starter: { products: 20, users: 5 },
  pro: { products: 100, users: 15 },
  business: { products: 1000, users: 50 },
};
