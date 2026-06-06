'use client';

import { loadStripe } from '@stripe/stripe-js';

const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
	throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
}

let stripePromise: ReturnType<typeof loadStripe>;

export const getStripe = () => {
	if (!stripePromise) {
		stripePromise = loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).catch((error) => {
			console.error('Failed to load Stripe:', error);
			throw error; // Re-throw to prevent silently failing but ensure error is logged
		});
	}
	return stripePromise;
};
