'use client';
import { tokenLiveKitRoom } from '@/core/services/server/livekitroom';
import { useEffect, useState } from 'react';

interface ITokenLiveKitProps {
	roomName: string;
}

export function useTokenLiveKit({ roomName }: ITokenLiveKitProps) {
	const [issued, setIssued] = useState<{ room: string; token: string } | null>(null);

	useEffect(() => {
		if (!roomName) return;

		// Responses can land out of order: the request for the room the user just left must not
		// overwrite the token of the room now on screen, which would leave the meeting blank with no
		// further request to recover it.
		let current = true;

		const fetchToken = async () => {
			try {
				const response = await tokenLiveKitRoom({ roomName });
				if (!current || !response?.token) return;
				setIssued({ room: roomName, token: response.token });
			} catch (error) {
				console.error('Failed to fetch token:', error);
			}
		};
		fetchToken();

		return () => {
			current = false;
		};
	}, [roomName]);

	// A token only grants the room it was issued for, so handing back one from a previous
	// room would publish local tracks into the room the user just left
	return { token: issued?.room === roomName ? issued.token : null };
}
