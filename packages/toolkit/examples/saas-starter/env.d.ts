declare namespace NodeJS {
	interface ProcessEnv {
		// Database
		POSTGRES_URL: string;

		// Authentication
		AUTH_SECRET: string;
		BASE_URL: string;

		// Stripe API Keys
		STRIPE_SECRET_KEY: string;
		STRIPE_WEBHOOK_SECRET: string;
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;

		// App Configuration
		NEXT_PUBLIC_APP_URL: string;

		// Teams API
		NEXT_PUBLIC_TEAMS_API_URL: string;
	}
}
