'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { POSTHOG_HOST, POSTHOG_KEY } from '@/core/constants/config/constants';

export default function PostHogPageView(): null {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const posthog = usePostHog();

	useEffect(() => {
		if (!POSTHOG_KEY.value || !POSTHOG_HOST.value) return;

		// Track pageviews
		if (pathname && posthog) {
			let url = window.origin + pathname;
			if (searchParams.toString()) {
				url = url + `?${searchParams.toString()}`;
			}
			posthog.capture('$pageview', {
				$current_url: url
			});
		}
	}, [pathname, searchParams, posthog]);

	return null;
}
