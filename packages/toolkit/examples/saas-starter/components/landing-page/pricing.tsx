'use client';

import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Badge, cn } from '@ever-teams/toolkit-ui';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { JSX, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { checkoutAction } from '@/lib/payments/actions';
import { useFormStatus } from 'react-dom';

type PricingInterval = 'monthly' | 'yearly';

type StripePrice = {
	id: string;
	amount: number;
	currency: string;
	interval: string;
};

type StripePricingData = {
	id: string;
	name: string;
	description: string;
	prices: {
		monthly: StripePrice | null;
		yearly: StripePrice | null;
	};
	defaultPriceId?: string;
};

type PricingPlan = {
	id: string;
	name: string;
	price: number | string;
	priceId: string | null | undefined;
	description: string;
	features: string[];
	popular: boolean;
	interval: PricingInterval;
};

// Background decoration component
function PricingBackground(): JSX.Element {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-orange-400/10 to-red-400/10 rounded-full blur-3xl"></div>
			<div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
		</div>
	);
}

// Header section with title and description
function PricingHeader(): JSX.Element {
	const t = useTranslations('Pricing');

	return (
		<div className="text-center mb-10">
			<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 border border-orange-200 dark:border-orange-700 mb-8">
				<div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
				<span className="text-sm font-medium text-orange-700 dark:text-orange-300">{t('badge')}</span>
			</div>
			<h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 to-orange-900 dark:from-white dark:to-orange-200 bg-clip-text text-transparent mb-6">
				{t('heading')}
			</h2>
			<p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
				{t('description')}
			</p>
		</div>
	);
}

// Interval toggle component
interface IntervalToggleProps {
	interval: PricingInterval;
	onIntervalChange: (interval: PricingInterval) => void;
}

function IntervalToggle({ interval, onIntervalChange }: IntervalToggleProps): JSX.Element {
	const t = useTranslations('Pricing');

	return (
		<div className="flex justify-center gap-4 mt-8 mb-16">
			<button
				onClick={() => onIntervalChange('monthly')}
				className={cn(
					'px-6 py-3 rounded-full transition-all duration-300 font-medium',
					interval === 'monthly'
						? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
						: 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
				)}
			>
				{t('monthly')}
			</button>
			<button
				onClick={() => onIntervalChange('yearly')}
				className={cn(
					'px-6 py-3 rounded-full transition-all duration-300 font-medium relative',
					interval === 'yearly'
						? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
						: 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
				)}
			>
				{t('annually')}
				<span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-1 rounded-full">
					{t('save_20')}
				</span>
			</button>
		</div>
	);
}

// Loading state component
function PricingLoading(): JSX.Element {
	const t = useTranslations('Pricing');

	return (
		<div className="flex justify-center items-center py-20">
			<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
			<span className="ml-2 text-slate-600 dark:text-slate-300">{t('loading_pricing')}</span>
		</div>
	);
}

// Error state component
interface PricingErrorProps {
	error: string;
}

function PricingError({ error }: PricingErrorProps): JSX.Element {
	const t = useTranslations('Pricing');

	return (
		<div className="text-center py-20">
			<p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
			<Button
				onClick={() => window.location.reload()}
				variant="outline"
				className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				{t('retry')}
			</Button>
		</div>
	);
}

// Feature list component
interface FeatureListProps {
	features: string[];
	isPopular: boolean;
}

function FeatureList({ features, isPopular }: FeatureListProps): JSX.Element {
	return (
		<ul className="space-y-4">
			{features.map((feature, featureIndex) => (
				<li key={featureIndex} className="flex items-start">
					<div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5 group-hover:scale-110 transition-transform">
						<Check className="h-3 w-3 text-white" />
					</div>
					<span
						className={`text-base leading-relaxed ${
							isPopular ? 'text-orange-100' : 'text-slate-700 dark:text-slate-300'
						}`}
					>
						{feature}
					</span>
				</li>
			))}
		</ul>
	);
}

// Checkout button component with loading state
interface CheckoutButtonProps {
	plan: PricingPlan;
}

function CheckoutButton({ plan }: CheckoutButtonProps): JSX.Element {
	const { pending } = useFormStatus();
	const t = useTranslations('Pricing');

	return (
		<Button
			type="submit"
			disabled={pending}
			className={`w-full transition-all duration-300 group text-lg py-3 ${
				plan.popular
					? 'bg-white text-blue-900 hover:bg-blue-50 shadow-lg hover:shadow-xl dark:text-blue-900'
					: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
			} ${pending ? 'opacity-75 cursor-not-allowed' : ''}`}
		>
			{pending ? (
				<>
					<Loader2 className="animate-spin mr-2 h-4 w-4" />
					{t('loading_pricing')}
				</>
			) : (
				<>
					{t('get_started')}
					<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
				</>
			)}
		</Button>
	);
}

// Individual pricing card component
interface PricingCardProps {
	plan: PricingPlan;
	interval: PricingInterval;
}

function PricingCard({ plan, interval }: PricingCardProps): JSX.Element {
	const t = useTranslations('Pricing');

	return (
		<Card
			className={`relative group transition-all duration-500 border-0 shadow-lg hover:shadow-xl h-fit ${
				plan.popular
					? 'bg-gradient-to-br from-blue-900 to-purple-900 dark:from-blue-800 dark:to-purple-800 scale-105 shadow-2xl shadow-blue-500/25'
					: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg hover:scale-105'
			}`}
		>
			{plan.popular && (
				<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
					<Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 shadow-lg ">
						{t('most_popular')}
					</Badge>
				</div>
			)}
			{!plan.popular && (
				<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
			)}
			<div className="relative z-10 h-full flex flex-col">
				<CardHeader className="text-center pb-6 pt-8">
					<CardTitle
						className={`text-2xl font-bold mb-2 transition-colors ${
							plan.popular
								? 'text-white'
								: 'text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-100'
						}`}
					>
						{plan.name}
					</CardTitle>
					<CardDescription
						className={plan.popular ? 'text-orange-200' : 'text-slate-600 dark:text-slate-400'}
					>
						{plan.description}
					</CardDescription>
					<div className="mt-6">
						<div className="flex items-baseline justify-center">
							<span
								className={`text-4xl sm:text-5xl font-bold ${
									plan.popular
										? 'text-white'
										: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
								}`}
							>
								{typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
							</span>
							{typeof plan.price === 'number' && (
								<span
									className={`ml-2 text-lg ${plan.popular ? 'text-orange-200' : 'text-slate-600 dark:text-slate-400'}`}
								>
									{interval === 'monthly' ? t('per_month') : t('per_year')}
								</span>
							)}
						</div>
						{interval === 'yearly' && typeof plan.price === 'number' && plan.price > 0 && (
							<div className="text-center mt-2">
								<span
									className={`text-sm ${plan.popular ? 'text-orange-200' : 'text-slate-500 dark:text-slate-400'}`}
								>
									{t('billed_annually')}
								</span>
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent className="px-8 flex-grow">
					<FeatureList features={plan.features} isPopular={plan.popular} />
				</CardContent>
				<CardFooter className="px-8 pb-8 mt-auto">
					{plan.priceId ? (
						// Form for plans with valid priceId (Starter, Pro)
						<form action={checkoutAction} className="w-full">
							<input type="hidden" name="priceId" value={plan.priceId} />
							<CheckoutButton plan={plan} />
						</form>
					) : (
						// Regular button for Enterprise plan (Contact Sales)
						<Button
							className={`w-full transition-all duration-300 group text-lg py-3 ${
								plan.popular
									? 'bg-white text-blue-900 hover:bg-blue-50 shadow-lg hover:shadow-xl dark:text-blue-900'
									: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
							}`}
							disabled
						>
							{t('contact_sales')}
							<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
						</Button>
					)}
				</CardFooter>
			</div>
		</Card>
	);
}

export function PricingSection(): JSX.Element {
	const t = useTranslations('Pricing');
	const [interval, setInterval] = useState<PricingInterval>('monthly');
	const [pricingData, setPricingData] = useState<StripePricingData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch pricing data from Stripe
	useEffect(() => {
		const fetchPricingData = async () => {
			try {
				setIsLoading(true);
				const response = await fetch('/api/stripe/pricing');
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to fetch pricing data');
				}

				setPricingData(result.data);
			} catch (err) {
				console.error('Error fetching pricing data:', err);
				setError(err instanceof Error ? err.message : 'Failed to load pricing data');
			} finally {
				setIsLoading(false);
			}
		};

		fetchPricingData();
	}, []);

	// Get features for a product (you can customize this based on your Stripe product metadata)
	const getProductFeatures = (productName: string) => {
		const name = productName.toLowerCase();
		if (name.includes('starter')) {
			return [t('starter.feature_1'), t('starter.feature_2'), t('starter.feature_3'), t('starter.feature_4')];
		} else if (name.includes('pro') || name.includes('professional')) {
			return [
				t('professional.feature_1'),
				t('professional.feature_2'),
				t('professional.feature_3'),
				t('professional.feature_4'),
				t('professional.feature_5')
			];
		} else if (name.includes('enterprise')) {
			return [
				t('enterprise.feature_1'),
				t('enterprise.feature_2'),
				t('enterprise.feature_3'),
				t('enterprise.feature_4'),
				t('enterprise.feature_5')
			];
		}
		return [];
	};

	// Map Stripe data to pricing plans with fallback to static data
	const getPricingPlans = () => {
		// Always include the hardcoded Enterprise plan
		const enterprisePlan = {
			id: 'enterprise',
			name: t('enterprise.name'),
			price: t('contact_sales'),
			priceId: null,
			description: t('enterprise.description'),
			features: [
				t('enterprise.feature_1'),
				t('enterprise.feature_2'),
				t('enterprise.feature_3'),
				t('enterprise.feature_4'),
				t('enterprise.feature_5')
			],
			popular: false,
			interval: interval
		};

		if (pricingData.length > 0) {
			// Map Stripe data and filter out any enterprise plans from Stripe
			const stripePlans = pricingData
				.filter((product) => !product.name.toLowerCase().includes('enterprise'))
				.map((product) => {
					const currentPrice = interval === 'monthly' ? product.prices.monthly : product.prices.yearly;
					// Only Pro/Professional plans are popular, Starter is not
					const isPopular =
						product.name.toLowerCase().includes('pro') ||
						product.name.toLowerCase().includes('professional');

					return {
						id: product.id,
						name: product.name,
						price: currentPrice ? currentPrice.amount : 0,
						priceId: currentPrice?.id,
						description: product.description || t(`${product.name.toLowerCase()}.description`),
						features: getProductFeatures(product.name),
						popular: isPopular,
						interval: interval
					};
				});

			// Sort plans: Starter first, then Pro, then others
			const getPlanRank = (name: string): number => {
				const lowerName = name.toLowerCase();
				if (lowerName.includes('starter')) return 1;
				if (lowerName.includes('pro') || lowerName.includes('professional')) return 2;
				return 3;
			};

			const sortedStripePlans = stripePlans.sort((a, b) => {
				const rankA = getPlanRank(a.name);
				const rankB = getPlanRank(b.name);
				return rankA - rankB;
			});

			// Return sorted Stripe plans + hardcoded Enterprise plan at the end
			return [...sortedStripePlans, enterprisePlan];
		}

		// Fallback to static data if Stripe data is not available
		// Order: Starter, Professional, Enterprise (left to right)
		return [
			{
				id: 'starter',
				name: t('starter.name'),
				price: interval === 'monthly' ? 3 : 30,
				priceId: null,
				description: t('starter.description'),
				features: [
					t('starter.feature_1'),
					t('starter.feature_2'),
					t('starter.feature_3'),
					t('starter.feature_4')
				],
				popular: false, // Starter is not popular
				interval: interval
			},
			{
				id: 'professional',
				name: t('professional.name'),
				price: interval === 'monthly' ? 10 : 100,
				priceId: null,
				description: t('professional.description'),
				features: [
					t('professional.feature_1'),
					t('professional.feature_2'),
					t('professional.feature_3'),
					t('professional.feature_4'),
					t('professional.feature_5')
				],
				popular: true, // Professional is popular
				interval: interval
			},
			enterprisePlan // Enterprise plan comes last (right-most)
		];
	};

	const pricingPlans = getPricingPlans();

	return (
		<section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
			<PricingBackground />

			<div className="max-w-7xl mx-auto relative">
				<PricingHeader />
				<IntervalToggle interval={interval} onIntervalChange={setInterval} />

				{/* Loading State */}
				{isLoading && <PricingLoading />}

				{/* Error State */}
				{error && !isLoading && <PricingError error={error} />}

				{/* Pricing Cards */}
				{!isLoading && !error && (
					<div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
						{pricingPlans.map((plan, index) => (
							<PricingCard key={plan.id || index} plan={plan} interval={interval} />
						))}
					</div>
				)}
			</div>
		</section>
	);
}
