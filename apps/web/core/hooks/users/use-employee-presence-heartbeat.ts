'use client';

import { useEffect } from 'react';
import { EMPLOYEE_PRESENCE_CONSTANTS } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { syncServerClock } from '@/core/lib/utils/team-members.utils';
import { employeeService } from '@/core/services/client/api/organizations/teams';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const INTERACTION_EVENTS = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'] as const;

// Windows of the same browser share their last input, so a visible window left untouched next to the
// one in use does not report the person idle. Written at most every 10 s: mousemove fires constantly.
const SHARED_INTERACTION_KEY = 'employee-presence-last-interaction';
const SHARED_INTERACTION_WRITE_MS = 10_000;

const readSharedInteraction = (): number => {
	try {
		return Number(window.localStorage.getItem(SHARED_INTERACTION_KEY)) || 0;
	} catch {
		return 0;
	}
};

const writeSharedInteraction = (at: number) => {
	try {
		window.localStorage.setItem(SHARED_INTERACTION_KEY, String(at));
	} catch {
		// Storage can be blocked: each window then decides from its own input.
	}
};

/**
 * Reports the signed-in employee's presence to Gauzy so teammates can see them online or idle:
 * a heartbeat every minute while the tab is visible, and one as soon as it is visible again. The
 * heartbeat says idle when there was no keyboard, mouse or touch input for ten minutes in any
 * window of this browser.
 */
export function useEmployeePresenceHeartbeat() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id;

	useEffect(() => {
		if (!employeeId) return;

		// A Gauzy API without the presence endpoint (before ever-gauzy #10508) answers 404: stop asking
		// instead of sending a failing request every minute from every open tab.
		let unavailable = false;
		let lastInteractionAt = 0;
		let lastSharedAt = 0;
		const markInteraction = () => {
			lastInteractionAt = Date.now();
			if (lastInteractionAt - lastSharedAt < SHARED_INTERACTION_WRITE_MS) return;

			lastSharedAt = lastInteractionAt;
			writeSharedInteraction(lastInteractionAt);
		};

		const sendHeartbeat = () => {
			if (unavailable || document.visibilityState !== 'visible') return;

			const lastInput = Math.max(lastInteractionAt, readSharedInteraction());
			const isIdle = Date.now() - lastInput >= EMPLOYEE_PRESENCE_CONSTANTS.IDLE_AFTER_MS;
			// A missed heartbeat only lets the presence expire, the next one sets it again.
			employeeService
				.sendPresenceHeartbeat(isIdle)
				.then((presence) => syncServerClock(presence?.lastSeenAt))
				.catch((error) => {
					if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) unavailable = true;
				});
		};

		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible') return;

			// Bringing the tab back takes a click or a key press outside the page, which no page event sees.
			markInteraction();
			sendHeartbeat();
		};

		markInteraction();
		sendHeartbeat();
		const interval = window.setInterval(sendHeartbeat, EMPLOYEE_PRESENCE_CONSTANTS.HEARTBEAT_INTERVAL_MS);
		document.addEventListener('visibilitychange', onVisibilityChange);
		INTERACTION_EVENTS.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));

		return () => {
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			INTERACTION_EVENTS.forEach((event) => window.removeEventListener(event, markInteraction));
		};
	}, [employeeId]);
}
