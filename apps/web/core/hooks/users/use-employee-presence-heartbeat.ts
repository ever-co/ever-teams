'use client';

import { useEffect } from 'react';
import { EMPLOYEE_PRESENCE_CONSTANTS } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { employeeService } from '@/core/services/client/api/organizations/teams';

const INTERACTION_EVENTS = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'] as const;

/**
 * Reports the signed-in employee's presence to Gauzy so teammates can see them online or idle:
 * a heartbeat every minute while the tab is visible, and one as soon as it is visible again. The
 * heartbeat says idle when there was no keyboard, mouse or touch input for ten minutes.
 */
export function useEmployeePresenceHeartbeat() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id;

	useEffect(() => {
		if (!employeeId) return;

		let lastInteractionAt = Date.now();
		const markInteraction = () => {
			lastInteractionAt = Date.now();
		};

		const sendHeartbeat = () => {
			if (document.visibilityState !== 'visible') return;

			const isIdle = Date.now() - lastInteractionAt >= EMPLOYEE_PRESENCE_CONSTANTS.IDLE_AFTER_MS;
			// A missed heartbeat only lets the presence expire, the next one sets it again.
			employeeService.sendPresenceHeartbeat(isIdle).catch(() => undefined);
		};

		const onVisibilityChange = () => {
			if (document.visibilityState !== 'visible') return;

			// Bringing the tab back takes a click or a key press outside the page, which no page event sees.
			markInteraction();
			sendHeartbeat();
		};

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
