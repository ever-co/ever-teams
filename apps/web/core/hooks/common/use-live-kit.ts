'use client';
import { tokenLiveKitRoom } from '@/core/services/server/livekitroom';
import { useEffect, useState } from 'react';

interface ITokenLiveKitProps {
	roomName: string;
}

export function useTokenLiveKit({ roomName }: ITokenLiveKitProps) {
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		// A stale token would publish local tracks into the room the user just left
		setToken(null);

		if (!roomName) return;

		let cancelled = false;

		const fetchToken = async () => {
			try {
				const response = await tokenLiveKitRoom({ roomName });
				if (cancelled || !response?.token) return;
				setToken(response.token);
			} catch (error) {
				console.error('Failed to fetch token:', error);
			}
		};
		fetchToken();

		return () => {
			cancelled = true;
		};
	}, [roomName]);

	return { token };
}
