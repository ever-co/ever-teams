import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';

async function createStripeProducts() {
	console.log('Creating Stripe products and prices...');

	const baseProduct = await stripe.products.create({
		name: 'Starter',
		description: 'For small teams'
	});

	await stripe.prices.create({
		product: baseProduct.id,
		unit_amount: 300, // $3 in cents
		currency: 'usd',
		recurring: {
			interval: 'month',
			trial_period_days: 7
		}
	});

	await stripe.prices.create({
		product: baseProduct.id,
		unit_amount: 3000, // $30 in cents
		currency: 'usd',
		recurring: {
			interval: 'year',
			trial_period_days: 7
		}
	});

	const plusProduct = await stripe.products.create({
		name: 'Professional',
		description: 'For growing teams'
	});

	await stripe.prices.create({
		product: plusProduct.id,
		unit_amount: 1000, // $10 in cents
		currency: 'usd',
		recurring: {
			interval: 'month',
			trial_period_days: 7
		}
	});

	await stripe.prices.create({
		product: plusProduct.id,
		unit_amount: 10000, // $100 in cents
		currency: 'usd',
		recurring: {
			interval: 'year',
			trial_period_days: 7
		}
	});

	console.log('Stripe products and prices created successfully.');
}

async function seed() {
	const email = 'test@test.com';
	const password = 'admin123';
	const passwordHash = await hashPassword(password);

	const [user] = await db
		.insert(users)
		.values([
			{
				email: email,
				passwordHash: passwordHash,
				role: 'owner'
			}
		])
		.returning();

	console.log('Initial user created.');

	const [team] = await db
		.insert(teams)
		.values({
			name: 'Test Team'
		})
		.returning();

	await db.insert(teamMembers).values({
		teamId: team.id,
		userId: user.id,
		role: 'owner'
	});

	await createStripeProducts();
}

seed()
	.catch((error) => {
		console.error('Seed process failed:', error);
		process.exit(1);
	})
	.finally(() => {
		console.log('Seed process finished. Exiting...');
		process.exit(0);
	});
