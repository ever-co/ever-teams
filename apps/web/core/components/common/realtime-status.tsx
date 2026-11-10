'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import type { RealtimeStatus as RealtimeConnectionStatus } from '@/core/lib/realtime/client';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';

/** A connection counts as established once it stayed up this long. */
export const REALTIME_STABLE_AFTER_MS = 10_000;
/** The note waits this long after a drop, so a reconnect that succeeds at once shows nothing. */
export const REALTIME_NOTE_SHOW_AFTER_MS = 2_500;
/** The note leaves once the connection is back for this long, so a connection that drops again at once keeps it. */
export const REALTIME_NOTE_HIDE_AFTER_MS = 1_500;

/**
 * Whether to say "reconnecting": only after a connection that had been established dropped, and has stayed down for a
 * moment. A platform that accepts the connection and ends it right away (an older platform, a proxy that cuts
 * sockets) never had a live connection to lose: the app keeps polling there, and nothing is announced.
 */
function useReconnectingNote(status: RealtimeConnectionStatus): boolean {
	const [visible, setVisible] = useState(false);
	const everStable = useRef(false);
	// Off, stopped or connecting for the first time: the client starts over, and so does the note (a guarded update
	// while rendering, so a note shown before a restart cannot flash again when the new connection comes up).
	const startsOver = status !== 'connected' && status !== 'reconnecting';
	if (startsOver && visible) setVisible(false);

	useEffect(() => {
		if (startsOver) {
			// What a connection before the restart proved says nothing about the next one.
			everStable.current = false;
			return undefined;
		}
		if (status === 'connected') {
			const stable = setTimeout(() => {
				everStable.current = true;
			}, REALTIME_STABLE_AFTER_MS);
			const hide = setTimeout(() => setVisible(false), REALTIME_NOTE_HIDE_AFTER_MS);
			return () => {
				clearTimeout(stable);
				clearTimeout(hide);
			};
		}
		if (status === 'reconnecting' && everStable.current) {
			const show = setTimeout(() => setVisible(true), REALTIME_NOTE_SHOW_AFTER_MS);
			return () => clearTimeout(show);
		}
		return undefined;
	}, [startsOver, status]);

	return visible && !startsOver;
}

/**
 * A discreet "reconnecting" note while the tab's live connection is down after a drop. Nothing is shown while
 * connected, while the feature is off, when the platform refused the connection, or when no connection was ever
 * established (polling carries on silently). It sits at the bottom centre, clear of the support bubble and of the
 * toasts, and appears once per drop, so a screen reader announces it once.
 */
export function RealtimeStatus() {
	const status = useAtomValue(realtimeStatusAtom);
	const t = useTranslations();
	const visible = useReconnectingNote(status);

	if (!visible) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="pointer-events-none fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md shadow-black/10 hairline-ring ring-border print:hidden"
		>
			<span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-amber-500" />
			{t('realtime.RECONNECTING')}
		</div>
	);
}
