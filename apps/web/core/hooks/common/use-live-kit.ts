'use client';
import { tokenLiveKitRoom } from '@/core/services/server/livekitroom';
import { useCallback, useEffect, useState } from 'react';

interface ITokenLiveKitProps {
	roomName: string;
}

export function useTokenLiveKit({ roomName }: ITokenLiveKitProps) {
	const [issued, setIssued] = useState<{ room: string; token: string } | null>(null);
	const [failure, setFailure] = useState<{ room: string; error: unknown } | null>(null);
	const [attempt, setAttempt] = useState(0);
	const [shownRoom, setShownRoom] = useState(roomName);

	// Opening a room again starts from its new request, not from the failure of an earlier visit
	if (shownRoom !== roomName) {
		setShownRoom(roomName);
		setFailure(null);
	}

	useEffect(() => {
		if (!roomName) return;

		// Responses can land out of order: the request for the room the user just left must not
		// overwrite the token of the room now on screen, which would leave the meeting blank with no
		// further request to recover it.
		let current = true;

		const fetchToken = async () => {
			try {
				const response = await tokenLiveKitRoom({ roomName });
				if (!current) return;
				if (!response?.token) {
					setFailure({ room: roomName, error: new Error('The LiveKit token answer has no token') });
					return;
				}
				setIssued({ room: roomName, token: response.token });
				setFailure(null);
			} catch (error) {
				console.error('Failed to fetch token:', error);
				// A failure the room can show with a retry, instead of a spinner with no further request
				if (current) {
					setFailure({ room: roomName, error });
				}
			}
		};
		fetchToken();

		return () => {
			current = false;
		};
	}, [roomName, attempt]);

	const retry = useCallback(() => {
		setFailure(null);
		setAttempt((count) => count + 1);
	}, []);

	/**
	 * Asks for a new token and drops the one in hand: LiveKit tokens expire, so going back into a room after a long
	 * meeting needs a fresh one, and the room waits for it.
	 */
	const refresh = useCallback(() => {
		setIssued(null);
		retry();
	}, [retry]);

	// A token only grants the room it was issued for, so handing back one from a previous
	// room would publish local tracks into the room the user just left
	const token = issued?.room === roomName ? issued.token : null;
	const error = failure?.room === roomName ? failure.error : null;

	return { token, error, retry, refresh };
}
