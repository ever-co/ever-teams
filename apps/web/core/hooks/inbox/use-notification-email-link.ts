'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
	keepNotificationEmailPage,
	pageOfNotificationEmailLink,
	takeNotificationEmailPage
} from '@/core/lib/notifications/notification-email-link';
import { stripLocalePrefix } from '@/core/lib/utils/navigation-path';

/** The page a sign-in ends on, unless something else was asked of it (navigate-after-sign-in.ts). */
const HOME_PAGE = '/';

/**
 * Opens the page a link of a Gauzy notification e-mail means (notification-email-link.ts), whatever page of the app
 * the link landed on. The route is in the fragment, which no server sees: it can only be read here.
 *
 * Signed out, the link lands on a sign-in page (the browser keeps the fragment through proxy.ts's redirect), and the
 * page it means is behind the sign-in: opening it from there would answer "unauthorized". The page is kept for the
 * tab and opened when the sign-in ends on the home page. The sign-in itself is not told: its workspace list clears
 * the page it is given (`setPathAfterSignIn`) for its own "Create a new workspace".
 */
export function useNotificationEmailLink() {
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const openLinkedPage = () => {
			const linked = pageOfNotificationEmailLink(window.location.hash);
			const path = stripLocalePrefix(pathname ?? '');

			if (path.startsWith('/auth/')) {
				if (linked) {
					keepNotificationEmailPage(linked);
				}
				return;
			}
			// The first page of the app this tab shows takes what was kept: a sign-in that ends somewhere else than
			// the home page (the creation of a workspace) keeps its own end, and the kept page is not left for later.
			const kept = takeNotificationEmailPage();
			const page = linked ?? (path === HOME_PAGE ? kept : null);
			if (page) {
				router.replace(page);
			}
		};
		openLinkedPage();
		// A link opened in a tab that is already on the app changes only the fragment, which the router does not see
		window.addEventListener('hashchange', openLinkedPage);
		return () => window.removeEventListener('hashchange', openLinkedPage);
	}, [pathname, router]);
}
