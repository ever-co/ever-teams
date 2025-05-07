'use client';
import { tokenLiveKitRoom } from '@/core/services/server/livekitroom';
import { useEffect, useState } from 'react';

interface ITokenLiveKitProps {
	roomName: string;
	username: string;
}

export function useTokenLiveKit({ roomName, username }: ITokenLiveKitProps) {
	const [token, setToken] = useState<string | null>(() => {
		if (typeof window !== 'undefined') {
			return window.localStorage.getItem('token-live-kit');
		}
		return null;
	});

	useEffect(() => {
		const fetchToken = async () => {
			try {
				const response = await tokenLiveKitRoom({ roomName, username });
				window.localStorage.setItem('token-live-kit', response.token);
				setToken(response.token);
			} catch (error) {
				console.error('Failed to fetch token:', error);
			}
		};
		fetchToken();
	}, [roomName, username]);

	return { token };
}
