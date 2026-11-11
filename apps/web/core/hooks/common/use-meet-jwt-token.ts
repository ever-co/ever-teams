'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryCall } from '@/core/hooks/common/use-query';
import { meetAuthService } from '@/core/services/client/api/auth/meet-auth';

/** Automatic retries of a failed access check before the room shows the error. */
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * The Jitsi token of a room, and the room it opens. A failed check is retried a few times, then reported; `retry`
 * starts the check over in place, without reloading the page.
 */
export function useMeetJwtToken(room?: string) {
	// The token only opens the room it was issued with, so both come from the same response
	const [issued, setIssued] = useState<{ requested: string; token: string; room: string }>();
	// When the token in hand was issued: one that waited too long is asked for again before the room opens
	const [issuedAt, setIssuedAt] = useState<number | null>(null);
	const [error, setError] = useState<Error>();
	const [retryCount, setRetryCount] = useState(0);
	const [attempt, setAttempt] = useState(0);
	const [retriedRoom, setRetriedRoom] = useState(room);
	const { queryCall, loading } = useQueryCall(meetAuthService.getMeetJwtAuthToken);

	// Another room starts with its own automatic retries, and without the error of the room left behind
	if (retriedRoom !== room) {
		setRetriedRoom(room);
		setRetryCount(0);
		setError(undefined);
	}

	useEffect(() => {
		// The answer for a room the user already left must not replace the one for the room on screen
		let current = true;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;

		const getToken = async () => {
			if (!room) return;
			try {
				const res = await queryCall({ room });
				if (!current) return;
				setIssued({ requested: room, token: res.data.token, room: res.data.room });
				setIssuedAt(Date.now());
				setError(undefined);
			} catch (err) {
				if (!current) return;
				console.error('Failed to fetch JWT token:', err);

				// If we haven't exceeded max retries, try again after delay
				if (retryCount < MAX_RETRIES) {
					retryTimer = setTimeout(() => {
						setRetryCount((prev) => prev + 1);
					}, RETRY_DELAY);
					return;
				}

				setError(err as Error);
			}
		};

		// getToken catches its own failures, so nothing waits on it
		void getToken();

		return () => {
			current = false;
			clearTimeout(retryTimer);
		};
	}, [queryCall, retryCount, room, attempt]);

	const retry = useCallback(() => {
		setError(undefined);
		setRetryCount(0);
		setAttempt((count) => count + 1);
	}, []);

	/**
	 * Asks for a new token and drops the one in hand: the meeting server's tokens last an hour, so going back into a
	 * room after a long meeting needs a fresh one, and the room waits for it.
	 */
	const refresh = useCallback(() => {
		setIssued(undefined);
		setIssuedAt(null);
		retry();
	}, [retry]);

	// A previous room's token would keep the user in the meeting they just left
	const meeting = issued?.requested === room ? issued : undefined;

	// A retry that succeeded leaves retryCount above zero: the room is retrying only while it has no answer
	return {
		loading,
		meeting,
		issuedAt: meeting ? issuedAt : null,
		error,
		retrying: retryCount > 0 && !meeting && !error,
		retry,
		refresh
	};
}
