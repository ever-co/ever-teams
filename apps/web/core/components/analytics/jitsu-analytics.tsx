'use client';

import { redactedPageLocation } from '@/core/lib/helpers/analytics-redaction';
import { TUser } from '@/core/types/schemas';
import { useJitsu } from '@jitsu/jitsu-react';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

/**
 * Jitsu reads the page address and the referrer from the browser for every event, and the pages the auth e-mails open
 * carry a live credential there (`/auth/reset-password?token=`, `/auth/accept-invite?email=&code=`, the magic sign-in
 * link, `/verify-email?token=`). Each event is handed the redacted address instead: the page properties, and the
 * `context.page` Jitsu merges over the one it read.
 */
function pageLocation() {
	return redactedPageLocation(window.location.href, document.referrer);
}

export function JitsuAnalytics({ user }: { user?: TUser | null }) {
	const { analytics } = useJitsu();
	const pathname = usePathname();

	useEffect(() => {
		if (user?.id) {
			const { url, search, referrer } = pageLocation();
			analytics.identify(
				user.id,
				{
					email: user.email,
					name: user.name,
					tenant: user?.tenant?.name,
					tenantId: user?.tenant?.id
				},
				{ context: { page: { url, search, referrer } } }
			);
		}
	}, [user, analytics, pathname]);

	useEffect(() => {
		const page = pageLocation();
		analytics.page(pathname, {
			...page,
			context: {
				page: { url: page.url, search: page.search, referrer: page.referrer },
				email: user?.email,
				name: user?.name,
				tenant: user?.tenant?.name,
				tenantId: user?.tenant?.id
			}
		});
	}, [pathname, user, analytics]);
	return <React.Fragment />;
}
