'use client';

import { useCallback, useEffect, useState } from 'react';

/** Seconds a person waits before asking for another sign-in code. */
export const RESEND_CODE_COOLDOWN_SECONDS = 60;

const formatCountdown = (seconds: number) =>
	`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Keeps a "resend code" button locked for a while after a code went out, so repeated clicks do not send
 * one e-mail each.
 *
 * @param startLocked - true when a code was sent just before the button appeared (the passcode screen).
 */
export function useResendCooldown(startLocked = false) {
	const [secondsLeft, setSecondsLeft] = useState(startLocked ? RESEND_CODE_COOLDOWN_SECONDS : 0);

	useEffect(() => {
		if (secondsLeft <= 0) return;
		const timeout = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
		return () => clearTimeout(timeout);
	}, [secondsLeft]);

	const start = useCallback(() => setSecondsLeft(RESEND_CODE_COOLDOWN_SECONDS), []);

	return { locked: secondsLeft > 0, countdown: formatCountdown(secondsLeft), start };
}
