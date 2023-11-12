// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DNS = process.env.SENTRY_DNS || process.env.NEXT_PUBLIC_SENTRY_DNS;
Sentry.init({
	dsn: SENTRY_DNS || 'https://4361bb774dbb4d85393853279ef4d872@o4506206535352320.ingest.sentry.io/4506213695094784',

	// Adjust this value in production, or use tracesSampler for greater control
	tracesSampleRate: 1,

	// Setting this option to true will print useful information to the console while you're setting up Sentry.
	debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG && process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true' ? true : false
});
