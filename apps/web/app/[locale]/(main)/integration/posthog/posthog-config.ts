import { POSTHOG_HOST, POSTHOG_KEY } from '@/core/constants/config/constants';

function currentPathname() {
	if (typeof window === 'undefined') {
		return '';
	}
	return window.location.pathname;
}

function currentHash() {
	if (typeof window === 'undefined') {
		return '';
	}
	return window.location.hash;
}

/**
 * The address the page load started on. Read when the root layout's bundle runs, before PostHog's own code is
 * fetched: the account deletion check has to look at where the visit began, not where it is once PostHog loads.
 */
export const POSTHOG_LANDING_PATHNAME = currentPathname();

/** The fragment the page load started with: the invoice link of an email carries its token there. */
export const POSTHOG_LANDING_HASH = currentHash();

/** PostHog runs only with a project key; without one its code is never fetched. */
export function isPostHogConfigured() {
	const hasKey = Boolean(POSTHOG_KEY.value);
	const hasHost = Boolean(POSTHOG_HOST.value);
	return hasKey && hasHost;
}
