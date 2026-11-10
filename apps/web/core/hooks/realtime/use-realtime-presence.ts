'use client';

import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { REALTIME_IDLE_AFTER_MS, REALTIME_PRESENCE_HEARTBEAT_MS } from '@/core/lib/realtime/config';
import type { RealtimePresenceStatus } from '@/core/lib/realtime/events';
import { realtimeService } from '@/core/services/client/api/realtime';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';

const INTERACTION_EVENTS = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'] as const;
/** A transition that failed (a network blip) is sent again this much later, unless a newer one went first. */
const RETRY_MS = 15_000;

let tabConnection: string | null = null;

/**
 * This tab's connection id: random, made once per page load, so the platform tells this tab's reports apart from the
 * employee's other tabs and devices (at most 64 letters, digits, `-` or `_`; a UUID).
 */
export function realtimeConnectionId(): string {
	if (!tabConnection) {
		const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
		tabConnection = random ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
	}
	return tabConnection;
}

/**
 * The presence the tab reports while its live connection is up, under its own connection id
 * ({@link realtimeConnectionId}): `active` on connect and on input after a pause, `idle` after ten minutes without
 * input, `away` while the window is hidden or unfocused, `offline` when the page unloads. Transitions are sent at
 * once, and the current state again every minute ({@link REALTIME_PRESENCE_HEARTBEAT_MS}) even when unchanged: the
 * platform stops counting a connection it has not heard from for 150 s. The employee is as present as their most
 * present tab, so a hidden tab does not mark an employee who works in another one away.
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

		const connectionId = realtimeConnectionId();
		const send = (next: RealtimePresenceStatus, heartbeat = false) => {
			if (unavailable || (!heartbeat && current === next)) return;
			current = next;
			realtimeService.presence(next, connectionId).catch((error) => {
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
		const report = (heartbeat = false) => {
			if (!visible()) {
				send('away', heartbeat);
				return;
			}
			send(Date.now() - lastInput >= REALTIME_IDLE_AFTER_MS ? 'idle' : 'active', heartbeat);
		};
		const onInput = () => {
			lastInput = Date.now();
			if (current !== 'active' && visible()) send('active');
		};
		const onUnload = () => {
			if (current === 'offline') return;
			current = 'offline';
			// A `keepalive` request: it outlives the page, where an ordinary one is cancelled with it.
			realtimeService.presenceOnUnload('offline', connectionId);
		};

		for (const event of INTERACTION_EVENTS) window.addEventListener(event, onInput, { passive: true });
		// A transition only (never the DOM event as the heartbeat flag).
		const onChange = () => report();
		document.addEventListener('visibilitychange', onChange);
		window.addEventListener('focus', onChange);
		window.addEventListener('blur', onChange);
		window.addEventListener('pagehide', onUnload);
		// The heartbeat: the current state again, changed or not, so the platform keeps counting this tab.
		const timer = window.setInterval(() => report(true), REALTIME_PRESENCE_HEARTBEAT_MS);
		report();

		return () => {
			for (const event of INTERACTION_EVENTS) window.removeEventListener(event, onInput);
			document.removeEventListener('visibilitychange', onChange);
			window.removeEventListener('focus', onChange);
			window.removeEventListener('blur', onChange);
			window.removeEventListener('pagehide', onUnload);
			window.clearInterval(timer);
			if (retry !== null) window.clearTimeout(retry);
		};
	}, [connected]);
}
