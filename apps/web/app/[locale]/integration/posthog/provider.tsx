'use client';

import { POSTHOG_HOST, POSTHOG_KEY } from '@app/constants';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

const key = POSTHOG_KEY.value;
const host = POSTHOG_HOST.value;

if (typeof window !== 'undefined' && key && host) {
	posthog.init(key, {
		api_host: host,
		person_profiles: 'identified_only',
		capture_pageview: false,
		capture_pageleave: true
	});
}

export function PHProvider({ children }: { children: React.ReactNode }) {
	if (!key || !host) {
		return <>{children}</>;
	}

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
