// Client instrumentation. Next.js evaluates this file at the top of every page's entry — after the inline runtime-env
// <script> that app/[locale]/layout.tsx renders first in <head>, and before hydration — so Sentry starts with the DSN
// this deployment sets at RUNTIME (NEXT_PUBLIC_SENTRY_DSN), and stays off, SDK not even downloaded, without one.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import type * as SentrySdk from '@sentry/nextjs';
import { initSentryClient } from './sentry.client.config';

let sentry: typeof SentrySdk | undefined;

void initSentryClient().then((sdk) => {
	sentry = sdk;
});

// Next.js reads this hook once, at hydration, so it must exist even while (or when) the SDK is not loaded.
// Navigations that start before the SDK arrives are simply not traced.
export function onRouterTransitionStart(href: string, navigationType: string): void {
	sentry?.captureRouterTransitionStart(href, navigationType);
}
