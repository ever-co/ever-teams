import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmbedAuthorizePage } from '@/core/components/pages/embeds/embed-authorize-page';

// A step of a sign-in a site opens, of no use to a search engine.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * `/embed/authorize?origin=<site>&organization=<id>`: the popup in which a person allows a site to start and stop
 * their timer (the kit's "Sign in with Ever Teams", ever-co/ever-gauzy#12094).
 */
export default function EmbedAuthorizeRoute() {
	return (
		<Suspense>
			<EmbedAuthorizePage />
		</Suspense>
	);
}
