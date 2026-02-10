import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
  : null;
