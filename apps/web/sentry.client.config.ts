// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DNS = process.env.SENTRY_DNS || process.env.NEXT_PUBLIC_SENTRY_DNS;
Sentry.init({
	dsn: SENTRY_DNS,
	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 1,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG && process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true' ? true : false,

	replaysOnErrorSampleRate: 1.0,

	// This sets the sample rate to be 10%. You may want this to be 100% while
	// in development and sample at a lower rate in production
	replaysSessionSampleRate: 0.1,

	// Replay may only be enabled for the client-side
	// You can remove this option if you're not planning to use the Sentry Session Replay feature:
	integrations: [
		new Sentry.Replay({
			// Additional Replay configuration goes in here, for example:
			maskAllText: true,
			blockAllMedia: true
		})
	]
});
// if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
// 	const Sentry = require('@sentry/node');
// 	Sentry.init({ dsn: process.env.SENTRY_DSN });
//   }
