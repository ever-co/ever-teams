'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { pageOfNotificationEmailLink } from '@/core/lib/notifications/notification-email-link';
import { stripLocalePrefix } from '@/core/lib/utils/navigation-path';

/** A sign-in page, where a signed-out visit ends: the page a link means cannot open from there. */
function isSignInPage(pathname: string | null): boolean {
	return stripLocalePrefix(pathname ?? '').startsWith('/auth/');
}

/**
 * Opens the page a link of a Gauzy notification e-mail means (notification-email-link.ts), whatever page of the app
 * the link landed on. The route is in the fragment, which no server sees: it can only be read here.
 *
 * A signed-out person gets the page once signed in: it is one of this app's own pages, named here and never taken
 * from the link, and the sign-in checks it again when it takes it.
 */
export function useNotificationEmailLink() {
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const openLinkedPage = () => {
			const page = pageOfNotificationEmailLink(window.location.hash);
			if (!page) {
				return;
			}
			// Signed out, the link lands on a sign-in page (the browser keeps the fragment through proxy.ts's
			// redirect). The page it means is behind the sign-in: opening it from here would answer "unauthorized".
			// The sign-in of this tab opens it instead of the home page (navigate-after-sign-in.ts).
			if (isSignInPage(pathname)) {
				setPathAfterSignIn(page);
				return;
			}
			router.replace(page);
		};
		openLinkedPage();
		// A link opened in a tab that is already on the app changes only the fragment, which the router does not see
		window.addEventListener('hashchange', openLinkedPage);
		return () => window.removeEventListener('hashchange', openLinkedPage);
	}, [pathname, router]);
}
