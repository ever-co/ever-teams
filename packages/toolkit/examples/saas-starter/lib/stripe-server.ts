import Stripe from 'stripe';

const getStripeSecretKey = () => {
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) {
		throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
	}
	return key;
};

let stripeInstance: Stripe | null = null;

const getStripeInstance = () => {
	if (!stripeInstance) {
		stripeInstance = new Stripe(getStripeSecretKey(), {
			apiVersion: '2025-02-24.acacia',
			typescript: true
		});
	}
	return stripeInstance;
};

export const stripe = new Proxy({} as Stripe, {
	get(_target, prop) {
		const instance = getStripeInstance();
		const value = instance[prop as keyof Stripe];
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
