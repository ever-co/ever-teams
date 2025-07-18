'use client';

import { TUser } from '@/core/types/schemas';
import { useJitsu } from '@jitsu/jitsu-react';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

export function JitsuAnalytics({ user }: { user?: TUser | null }) {
	const { analytics } = useJitsu();
	const pathname = usePathname();

	useEffect(() => {
		if (user?.id) {
			analytics.identify(user.id, {
				email: user.email,
				name: user.name,
				tenant: user?.tenant?.name,
				tenantId: user?.tenant?.id
			});
		}
	}, [user, analytics, pathname]);

	useEffect(() => {
		analytics.page(pathname, {
			context: {
				email: user?.email,
				name: user?.name,
				tenant: user?.tenant?.name,
				tenantId: user?.tenant?.id
			}
		});
	}, [pathname, user, analytics]);
	return <React.Fragment />;
}
