import { NextResponse } from 'next/server';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';

export async function GET() {
	try {
		const [prices, products] = await Promise.all([getStripePrices(), getStripeProducts()]);

		// Transform the data to match our pricing structure, only Starter and Professional plans
		const pricingData = products
			.filter((product) => product.name === 'Starter' || product.name === 'Professional') // Get only Starter and Professional
			.map((product) => {
				const productPrices = prices.filter((price) => price.productId === product.id);

				// Find monthly and yearly prices
				const monthlyPrice = productPrices.find((price) => price.interval === 'month');
				const yearlyPrice = productPrices.find((price) => price.interval === 'year');

				return {
					id: product.id,
					name: product.name,
					description: product.description || '',
					prices: {
						monthly: monthlyPrice
							? {
									id: monthlyPrice.id,
									amount: monthlyPrice.unitAmount ? monthlyPrice.unitAmount / 100 : 0,
									currency: monthlyPrice.currency,
									interval: monthlyPrice.interval
								}
							: null,
						yearly: yearlyPrice
							? {
									id: yearlyPrice.id,
									amount: yearlyPrice.unitAmount ? yearlyPrice.unitAmount / 100 : 0,
									currency: yearlyPrice.currency,
									interval: yearlyPrice.interval
								}
							: null
					},
					defaultPriceId: product.defaultPriceId
				};
			});

		return NextResponse.json({
			success: true,
			data: pricingData
		});
	} catch (error) {
		console.error('Error fetching Stripe pricing data:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch pricing data'
			},
			{ status: 500 }
		);
	}
}
