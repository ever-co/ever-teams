'use client';

import { POSTHOG_HOST, POSTHOG_KEY } from '@/core/constants/config/constants';
import { redactCaptureResult } from '@/core/lib/helpers/analytics-redaction';
import { isAccountDeletionPath } from '@/core/lib/auth/account-deletion';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

const key = POSTHOG_KEY.value;
const host = POSTHOG_HOST.value;

// A page load that starts on the account deletion pages leaves PostHog off (uninitialized, every call a no-op): it
// records the address it starts on, and the e-mailed link carries a deletion token in it (isAccountDeletionPath).
if (typeof window !== 'undefined' && key && host && !isAccountDeletionPath(window.location.pathname)) {
	posthog.init(key, {
		api_host: host,
		person_profiles: 'identified_only',
		capture_pageview: false,
		capture_pageleave: true,
		// The auth e-mail links carry their token / code in the address every event records
		before_send: redactCaptureResult
	});
}

export function PHProvider({ children }: { children: React.ReactNode }) {
	if (!key || !host) {
		return <>{children}</>;
	}

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
