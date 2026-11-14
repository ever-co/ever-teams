'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { parseSessionEndedNotice, storedSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';

// The note is written as the page that ends the session goes away: it does not change while this page is shown
const subscribeToNothing = () => () => undefined;
const noNoteOnTheServer = () => null;

/**
 * Tells a person the app signed out by itself why they are on the sign-in page: their session ended, which the page
 * shown alone does not say. Renders nothing after a sign-out the person asked for, or on a first visit.
 */
export function SessionEndedNotice({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	// Read once the page runs in the browser: the server's render has no storage of the tab
	const stored = useSyncExternalStore(subscribeToNothing, storedSessionEndedNotice, noNoteOnTheServer);
	const notice = useMemo(() => parseSessionEndedNotice(stored), [stored]);

	if (!notice) {
		return null;
	}

	return (
		<AuthNotice tone="warning" title={t('auth.sessionEnded.TITLE')} className={className}>
			{t('auth.sessionEnded.TEXT')}
		</AuthNotice>
	);
}
