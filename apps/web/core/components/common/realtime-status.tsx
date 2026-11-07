'use client';

import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';

/**
 * A discreet "reconnecting" note while the tab's live connection is down after a drop. Nothing is shown
 * while connected, while the feature is off, or when the platform refused the connection (polling carries on
 * silently). It appears once per drop, so a screen reader announces it once.
 */
export function RealtimeStatus() {
	const status = useAtomValue(realtimeStatusAtom);
	const t = useTranslations();

	if (status !== 'reconnecting') return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none fixed bottom-3 right-3 z-40 rounded-md border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
		>
			{t('realtime.RECONNECTING')}
		</div>
	);
}
