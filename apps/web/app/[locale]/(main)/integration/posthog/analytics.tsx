'use client';

import { PHProvider } from './provider';
import PostHogPageView from './page-view';

/** PostHog and its page views, loaded on demand by the root layout when a project key is configured. */
export default function PostHogAnalytics() {
	return (
		<PHProvider>
			<PostHogPageView />
		</PHProvider>
	);
}
