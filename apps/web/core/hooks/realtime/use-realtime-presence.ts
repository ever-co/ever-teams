'use client';

import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { REALTIME_IDLE_AFTER_MS } from '@/core/lib/realtime/config';
import type { RealtimePresenceStatus } from '@/core/lib/realtime/events';
import { realtimeService } from '@/core/services/client/api/realtime';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';

const INTERACTION_EVENTS = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'] as const;
const IDLE_CHECK_MS = 60_000;
/** A transition that failed (a network blip) is sent again this much later, unless a newer one went first. */
const RETRY_MS = 15_000;

/**
 * The presence the tab reports while its live connection is up: `active` on connect and on input after a
 * pause, `idle` after ten minutes without input, `away` while the window is hidden or unfocused, `offline` when
 * the page unloads. Only transitions are sent. The minute heartbeat stays as it is (it also persists the state
 * for clients that poll); this is what lets a colleague's status dot change within seconds.
 */
export function useRealtimePresence(): void {
	const status = useAtomValue(realtimeStatusAtom);
	const connected = status === 'connected';

	useEffect(() => {
		if (!connected || typeof window === 'undefined') return;

		let current: RealtimePresenceStatus | null = null;
		let unavailable = false;
		let lastInput = Date.now();
		let retry: number | null = null;

		const send = (next: RealtimePresenceStatus) => {
			if (unavailable || current === next) return;
			current = next;
			realtimeService.presence(next).catch((error) => {
				// A platform without the route (older release): stop asking.
				if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) {
					unavailable = true;
					return;
				}
				// Not delivered: forget it, so the next report sends the then-current state; a newer transition that
				// already went is left alone.
				if (current !== next) return;
				current = null;
				if (retry === null) {
					retry = window.setTimeout(() => {
						retry = null;
						report();
					}, RETRY_MS);
				}
			});
		};

		const visible = () => document.visibilityState === 'visible' && document.hasFocus();
		const report = () => {
			if (!visible()) {
				send('away');
				return;
			}
			send(Date.now() - lastInput >= REALTIME_IDLE_AFTER_MS ? 'idle' : 'active');
		};
		const onInput = () => {
			lastInput = Date.now();
			if (current !== 'active' && visible()) send('active');
		};
		const onUnload = () => {
			if (current === 'offline') return;
			current = 'offline';
			// A `keepalive` request: it outlives the page, where an ordinary one is cancelled with it.
			realtimeService.presenceOnUnload('offline');
		};

		for (const event of INTERACTION_EVENTS) window.addEventListener(event, onInput, { passive: true });
		document.addEventListener('visibilitychange', report);
		window.addEventListener('focus', report);
		window.addEventListener('blur', report);
		window.addEventListener('pagehide', onUnload);
		const timer = window.setInterval(report, IDLE_CHECK_MS);
		report();

		return () => {
			for (const event of INTERACTION_EVENTS) window.removeEventListener(event, onInput);
			document.removeEventListener('visibilitychange', report);
			window.removeEventListener('focus', report);
			window.removeEventListener('blur', report);
			window.removeEventListener('pagehide', onUnload);
			window.clearInterval(timer);
			if (retry !== null) window.clearTimeout(retry);
		};
	}, [connected]);
}
