'use client';

import { loadStripe } from '@stripe/stripe-js';

let stripePromise: ReturnType<typeof loadStripe>;

/**
 * The publishable key is a DEPLOYMENT value, so it must not be read from `process.env` here: Next
 * would inline the key of whoever built the image and no `docker run -e ...` could change it. Read it
 * on the server (lib/runtime-env.ts) and pass it down as a prop, like the Teams API URL in
 * components/layout/client-layout.tsx.
 */
export const getStripe = (publishableKey: string) => {
	if (!publishableKey) {
		throw new Error('A Stripe publishable key is required (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)');
	}
	if (!stripePromise) {
		stripePromise = loadStripe(publishableKey).catch((error) => {
			console.error('Failed to load Stripe:', error);
			throw error; // Re-throw to prevent silently failing but ensure error is logged
		});
	}
	return stripePromise;
};
