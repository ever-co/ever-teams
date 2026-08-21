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

		const fetchToken = async () => {
			try {
				const response = await tokenLiveKitRoom({ roomName });
				if (!response?.token) return;
				setIssued({ room: roomName, token: response.token });
			} catch (error) {
				console.error('Failed to fetch token:', error);
			}
		};
		fetchToken();
	}, [roomName]);

	// A token only grants the room it was issued for, so handing back one from a previous
	// room would publish local tracks into the room the user just left
	return { token: issued?.room === roomName ? issued.token : null };
}
